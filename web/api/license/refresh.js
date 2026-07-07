import { verifyLicense, mintForPlan } from '../../lib/license.js'
import { getPreapproval } from '../../lib/mp.js'
import { cors, LICENSE_PUBLIC_KEY } from '../../lib/pubkey.js'

// POST /api/license/refresh { key }
// The app calls this to (a) re-check paid subscription status with MP and
// (b) get a fresh rolling token. Trials just report time left.
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const key = (req.body?.key || '').toString()
    const payload = verifyLicense(key, LICENSE_PUBLIC_KEY)
    if (!payload) return res.status(200).json({ status: 'invalid' })

    const now = Math.floor(Date.now() / 1000)

    // Trial: fixed window, no extension.
    if (payload.t === 'trial') {
      const active = payload.exp > now
      return res.status(200).json({
        status: active ? 'active' : 'expired',
        plan: 'trial',
        exp: payload.exp,
        key
      })
    }

    // Paid: ask Mercado Pago if the subscription is still authorized.
    if (payload.sub) {
      let pa
      try {
        pa = await getPreapproval(payload.sub)
      } catch {
        // MP unreachable — let the app keep the existing (still-signed) token.
        return res.status(200).json({ status: 'unknown', plan: payload.t, exp: payload.exp, key })
      }
      if (pa.status === 'authorized') {
        const fresh = mintForPlan(payload.t, { sub: payload.sub, email: payload.email })
        const p = verifyLicense(fresh, LICENSE_PUBLIC_KEY)
        return res.status(200).json({ status: 'active', plan: payload.t, exp: p.exp, key: fresh })
      }
      return res.status(200).json({ status: 'inactive', plan: payload.t, exp: payload.exp, key })
    }

    // Paid token without sub (manually minted) — honor until exp.
    return res.status(200).json({
      status: payload.exp > now ? 'active' : 'expired',
      plan: payload.t,
      exp: payload.exp,
      key
    })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
