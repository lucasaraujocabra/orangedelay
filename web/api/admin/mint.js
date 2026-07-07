import { mintForPlan, PLAN_LABEL } from '../../lib/license.js'
import { cors } from '../../lib/pubkey.js'

// POST /api/admin/mint { secret, type, days?, email? }
// Owner-only. Generate a license key by hand — e.g. a 2-day TRIAL for a
// streamer to test, or a comped paid key.
//
//   curl -s -X POST https://orange-delay.vercel.app/api/admin/mint \
//     -H 'content-type: application/json' \
//     -d '{"secret":"SEU_ADMIN_SECRET","type":"trial"}'
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const { secret, type = 'trial', days, email } = req.body || {}
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'não autorizado' })
    }
    if (!['trial', 'monthly', 'annual'].includes(type)) {
      return res.status(400).json({ error: 'type inválido (trial|monthly|annual)' })
    }
    const key = mintForPlan(type, { days: days ? Number(days) : undefined, email })
    return res.status(200).json({ key, type, label: PLAN_LABEL[type] })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
