// Ed25519 public key — NOT secret. Also embedded in the desktop app.
export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5YWo65sl79RM/4lOC+aDgk04/ZdvYeauaCzzVtkjAe4=
-----END PUBLIC KEY-----`

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
