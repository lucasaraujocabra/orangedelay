// Minimal Mercado Pago "Assinaturas" (preapproval) REST client — no SDK.
const MP = 'https://api.mercadopago.com'

function token() {
  const t = process.env.MP_ACCESS_TOKEN
  if (!t) throw new Error('MP_ACCESS_TOKEN not set')
  return t
}

const PLANS = {
  monthly: {
    reason: 'OrangeDelay — Assinatura Mensal',
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: Number(process.env.MP_MONTHLY_AMOUNT || 9.99),
      currency_id: 'BRL'
    }
  },
  annual: {
    reason: 'OrangeDelay — Assinatura Anual',
    auto_recurring: {
      frequency: 12,
      frequency_type: 'months',
      transaction_amount: Number(process.env.MP_ANNUAL_AMOUNT || 119.88),
      currency_id: 'BRL'
    }
  }
}

/** Create a subscription (preapproval) and return { id, init_point }. */
export async function createPreapproval(plan, { email, backUrl }) {
  const cfg = PLANS[plan]
  if (!cfg) throw new Error('invalid plan')
  const body = {
    reason: cfg.reason,
    auto_recurring: cfg.auto_recurring,
    back_url: backUrl,
    status: 'pending'
  }
  if (email) body.payer_email = email
  const r = await fetch(`${MP}/preapproval`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`MP create failed: ${JSON.stringify(data)}`)
  return { id: data.id, init_point: data.init_point }
}

/** Fetch a preapproval → { status, payer_email }. status: authorized|pending|paused|cancelled */
export async function getPreapproval(id) {
  const r = await fetch(`${MP}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token()}` }
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`MP get failed: ${JSON.stringify(data)}`)
  return { status: data.status, payer_email: data.payer_email, plan: planFromAmount(data) }
}

function planFromAmount(pa) {
  const amt = pa?.auto_recurring?.transaction_amount
  const freq = pa?.auto_recurring?.frequency
  if (freq === 12) return 'annual'
  if (amt && amt >= 100) return 'annual'
  return 'monthly'
}
