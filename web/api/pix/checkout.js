import { createPreference } from '../../lib/mp.js'
import { cors } from '../../lib/pubkey.js'

// GET /api/pix/checkout?period=month|year
// One-time payment (Pix/QR, card or boleto) that unlocks a fixed period.
function comingSoon(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(
    '<!doctype html><meta charset="utf-8"><body style="background:#000;color:#fff;font-family:monospace;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="color:#FF5E1F">Pagamento em ativação</h2><p style="color:#aaa">Volte em breve.</p><a href="/" style="color:#FF5E1F">← voltar</a></div></body>'
  )
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const tok = process.env.MP_ACCESS_TOKEN
  if (!tok || tok.includes('COLOQUE')) {
    if (req.method === 'GET') return comingSoon(res)
    return res.status(503).json({ error: 'pagamento ainda não ativado' })
  }
  const period = (req.query?.period || req.body?.period || '').toString()
  if (!['month', 'year'].includes(period)) {
    return res.status(400).json({ error: 'period inválido (month|year)' })
  }
  try {
    const base = process.env.APP_URL || `https://${req.headers.host}`
    const { init_point } = await createPreference(period, { backUrl: `${base}/sucesso.html` })
    if (req.method === 'GET') {
      res.setHeader('Location', init_point)
      return res.status(302).end()
    }
    return res.status(200).json({ init_point })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
