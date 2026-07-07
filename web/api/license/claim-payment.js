import { getPayment } from '../../lib/mp.js'
import { mintForPlan } from '../../lib/license.js'
import { cors } from '../../lib/pubkey.js'

// GET /api/license/claim-payment?payment_id=...
// Called by sucesso.html after a one-time (Pix/card/boleto) payment.
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const id = (req.query?.payment_id || req.query?.id || req.body?.payment_id || '').toString()
    if (!id) return res.status(400).json({ error: 'payment_id ausente' })

    const p = await getPayment(id)
    if (p.status !== 'approved') {
      return res.status(202).json({
        status: p.status,
        message: 'Pagamento ainda não aprovado. Pix pode levar alguns segundos — recarregue.'
      })
    }
    const period = p.external_reference === 'year' ? 'year' : 'month'
    const plan = period === 'year' ? 'annual' : 'monthly'
    const days = period === 'year' ? 366 : 31
    // One-time: no `sub` → the app honors it until expiry (não renova sozinho).
    const key = mintForPlan(plan, { days })
    return res.status(200).json({ status: 'approved', plan, key })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
