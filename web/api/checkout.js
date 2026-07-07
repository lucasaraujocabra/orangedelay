import { cors } from '../lib/pubkey.js'

// GET /api/checkout?plan=monthly|annual -> 302 to the Mercado Pago subscription
// plan checkout (MP collects e-mail + Pix/cartão there).
const PLAN_IDS = {
  monthly: process.env.MP_PLAN_MONTHLY,
  annual: process.env.MP_PLAN_ANNUAL
}

function comingSoon(res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(
    '<!doctype html><meta charset="utf-8"><title>Em ativação</title>' +
      '<body style="background:#000;color:#fff;font-family:monospace;display:grid;place-items:center;height:100vh;margin:0">' +
      '<div style="text-align:center"><h2 style="color:#FF5E1F">Assinaturas em ativação</h2>' +
      '<p style="color:#aaa">Os planos estarão disponíveis em breve.</p>' +
      '<a href="/" style="color:#FF5E1F">← voltar</a></div></body>'
  )
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const plan = (req.query?.plan || req.body?.plan || '').toString()
  const planId = PLAN_IDS[plan]

  if (!planId) {
    if (req.method === 'GET') return comingSoon(res)
    return res.status(503).json({ error: 'assinaturas ainda não ativadas' })
  }

  const url = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planId}`
  if (req.method === 'GET') {
    res.setHeader('Location', url)
    return res.status(302).end()
  }
  return res.status(200).json({ init_point: url })
}
