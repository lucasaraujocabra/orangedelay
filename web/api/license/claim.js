import { getPreapproval } from '../../lib/mp.js'
import { mintForPlan } from '../../lib/license.js'
import { cors } from '../../lib/pubkey.js'

// GET /api/license/claim?preapproval_id=...  (called by sucesso.html after checkout)
// Verifies the subscription with Mercado Pago and issues the license key.
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const id = (req.query?.preapproval_id || req.query?.id || req.body?.preapproval_id || '').toString()
    if (!id) return res.status(400).json({ error: 'preapproval_id ausente' })

    const pa = await getPreapproval(id)
    if (pa.status !== 'authorized') {
      return res.status(202).json({ status: pa.status, message: 'Assinatura ainda não confirmada. Aguarde alguns segundos e tente de novo.' })
    }
    const key = mintForPlan(pa.plan, { sub: id, email: pa.payer_email })
    return res.status(200).json({ status: 'authorized', plan: pa.plan, key })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
