import crypto from 'crypto'
import Store from 'electron-store'
import type { LicenseStatus, LicensePlan } from '../shared/types'

// Ed25519 public key — verifies license tokens offline. (Public, safe to embed.)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5YWo65sl79RM/4lOC+aDgk04/ZdvYeauaCzzVtkjAe4=
-----END PUBLIC KEY-----`

// License/subscription backend (Mercado Pago lives behind it).
const BACKEND = 'https://orange-delay.vercel.app'

interface Payload {
  t: LicensePlan
  exp: number
  iss: number
  sub?: string
  email?: string
}

function verifyLocal(key: string): Payload | null {
  try {
    if (!key || !key.startsWith('OD-')) return null
    const [body, sigB64] = key.slice(3).split('.')
    if (!body || !sigB64) return null
    const ok = crypto.verify(null, Buffer.from(body), PUBLIC_KEY, Buffer.from(sigB64, 'base64url'))
    if (!ok) return null
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function statusFrom(key: string): LicenseStatus {
  if (!key) return { active: false, plan: null, state: 'none', expiresAt: null, daysLeft: null }
  const p = verifyLocal(key)
  if (!p) return { active: false, plan: null, state: 'invalid', expiresAt: null, daysLeft: null }
  const now = Math.floor(Date.now() / 1000)
  const active = p.exp > now
  const daysLeft = Math.max(0, Math.ceil((p.exp - now) / 86400))
  return {
    active,
    plan: p.t,
    state: active ? 'active' : 'expired',
    expiresAt: p.exp,
    daysLeft
  }
}

export class LicenseManager {
  private store: Store

  constructor() {
    this.store = new Store({ name: 'orangedelay-license' })
  }

  private get key(): string {
    return (this.store.get('key', '') as string) || ''
  }
  private set key(v: string) {
    if (v) this.store.set('key', v)
    else this.store.delete('key')
  }

  /** Instant, offline status. */
  status(): LicenseStatus {
    return statusFrom(this.key)
  }

  isActive(): boolean {
    return this.status().active
  }

  clear(): void {
    this.key = ''
  }

  /** Save a pasted key (validates signature) then refresh against the server. */
  async setKey(raw: string): Promise<LicenseStatus> {
    const key = (raw || '').trim()
    if (!verifyLocal(key)) {
      return { active: false, plan: null, state: 'invalid', expiresAt: null, daysLeft: null }
    }
    this.key = key
    return this.refresh()
  }

  /**
   * Ask the backend to re-check the subscription with Mercado Pago and hand
   * back a fresh rolling token. Offline / errors keep the current token.
   */
  async refresh(): Promise<LicenseStatus> {
    const key = this.key
    if (!key) return this.status()
    try {
      const r = await fetch(`${BACKEND}/api/license/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(8000)
      })
      const d = (await r.json()) as { status: string; key?: string }
      if (d.status === 'active' && d.key) {
        this.key = d.key
      } else if (d.status === 'inactive' || d.status === 'invalid' || d.status === 'expired') {
        // keep the key so the user sees the plan, but status() will read expiry.
        if (d.key && d.status !== 'invalid') this.key = d.key
      }
      // 'unknown'/network handled by falling through to local status.
    } catch {
      /* offline — keep local token */
    }
    return this.status()
  }

  checkoutUrl(plan: 'monthly' | 'annual'): string {
    return `${BACKEND}/api/checkout?plan=${plan}`
  }

  pixUrl(period: 'month' | 'year'): string {
    return `${BACKEND}/api/pix/checkout?period=${period}`
  }
}
