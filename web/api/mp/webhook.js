// POST /api/mp/webhook — Mercado Pago notifications.
// We don't keep a DB: enforcement happens live via /api/license/refresh
// (which queries MP). This endpoint just acknowledges so MP stops retrying,
// and is where you'd later hook e-mail delivery on 'authorized'.
export default async function handler(req, res) {
  try {
    // MP expects a fast 200/201.
    return res.status(200).json({ received: true })
  } catch {
    return res.status(200).end()
  }
}
