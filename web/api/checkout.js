import { createPreapproval } from '../lib/mp.js'
import { cors } from '../lib/pubkey.js'

// GET /api/checkout?plan=monthly|annual[&email=...]  -> 302 to Mercado Pago checkout
export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Mercado Pago ainda não configurado — evita botão quebrado no site.
  const tok = process.env.MP_ACCESS_TOKEN
  if (!tok || tok.includes('COLOQUE')) {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(
        '<!doctype html><meta charset="utf-8"><title>Em ativação</title>' +
          '<body style="background:#000;color:#fff;font-family:monospace;display:grid;place-items:center;height:100vh;margin:0">' +
          '<div style="text-align:center"><h2 style="color:#FF5E1F">Assinaturas em ativação</h2>' +
          '<p style="color:#aaa">Os planos estarão disponíveis em breve.</p>' +
          '<a href="/" style="color:#FF5E1F">← voltar</a></div></body>'
      )
    }
    return res.status(503).json({ error: 'assinaturas ainda não ativadas' })
  }

  try {
    const plan = (req.query?.plan || req.body?.plan || '').toString()
    const email = (req.query?.email || req.body?.email || '').toString() || undefined
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'plan inválido (monthly|annual)' })
    }
    const base = process.env.APP_URL || `https://${req.headers.host}`
    const { init_point } = await createPreapproval(plan, {
      email,
      backUrl: `${base}/sucesso.html`
    })
    // Link mode (landing / app): redirect straight to MP checkout.
    if (req.method === 'GET') {
      res.setHeader('Location', init_point)
      return res.status(302).end()
    }
    return res.status(200).json({ init_point })
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) })
  }
}
