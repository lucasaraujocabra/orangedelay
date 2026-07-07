import crypto from 'crypto'

// License token format:  OD-<base64url(payload)>.<base64url(ed25519 signature)>
// payload = { t, exp, iss, sub?, email? }
//   t    = 'trial' | 'monthly' | 'annual'
//   exp  = unix seconds (hard expiry the app enforces offline)
//   iss  = unix seconds issued-at
//   sub  = Mercado Pago preapproval id (paid plans) — source of truth for renewals
//   email= payer email (paid) / note (trial)

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const fromB64u = (s) => Buffer.from(s, 'base64url')

function privateKeyPem() {
  const b64 = process.env.LICENSE_PRIVATE_KEY_B64
  if (!b64) throw new Error('LICENSE_PRIVATE_KEY_B64 not set')
  return Buffer.from(b64, 'base64').toString('utf8')
}

export function signLicense(payload) {
  const body = b64u(JSON.stringify(payload))
  const sig = crypto.sign(null, Buffer.from(body), privateKeyPem())
  return `OD-${body}.${b64u(sig)}`
}

export function verifyLicense(key, publicKeyPem) {
  try {
    if (!key || !key.startsWith('OD-')) return null
    const [body, sigB64] = key.slice(3).split('.')
    if (!body || !sigB64) return null
    const ok = crypto.verify(null, Buffer.from(body), publicKeyPem, fromB64u(sigB64))
    if (!ok) return null
    return JSON.parse(fromB64u(body).toString('utf8'))
  } catch {
    return null
  }
}

const DAY = 86400

/** Issue a fresh token for a given plan. Paid plans get a rolling window. */
export function mintForPlan(plan, opts = {}) {
  const now = Math.floor(Date.now() / 1000)
  const windows = {
    trial: 2 * DAY,
    monthly: 33 * DAY, // 1 month + grace, refreshed while subscription is active
    annual: 372 * DAY // 1 year + grace
  }
  const secs = windows[plan]
  if (!secs) throw new Error('invalid plan: ' + plan)
  return signLicense({
    t: plan,
    iss: now,
    exp: now + (opts.days ? opts.days * DAY : secs),
    ...(opts.sub ? { sub: opts.sub } : {}),
    ...(opts.email ? { email: opts.email } : {})
  })
}

export const PLAN_LABEL = { trial: 'Trial', monthly: 'Mensal', annual: 'Anual' }
