# OrangeDelay — Licenças & Assinatura (guia do dono)

Sistema **sem banco de dados**: cada licença é um *token assinado* (Ed25519). O Mercado Pago
é a fonte de verdade das assinaturas — o app revalida no `/api/license/refresh`.

- **Backend + site:** https://orange-delay.vercel.app (projeto Vercel `orangedelay`, pasta `web/`)
- **App:** valida a licença offline (chave pública embutida) e **trava o "ENTRAR NO AR"** sem licença ativa.
- **Preços:** Mensal R$ 9,99 · Anual R$ 119,88 (12× 9,99).

---

## 1. Gerar um TESTE de 2 dias pro streamer (funciona JÁ)

Você "libera" um trial rodando isto (troque o secret pelo seu `ADMIN_SECRET`):

```bash
curl -s -X POST https://orange-delay.vercel.app/api/admin/mint \
  -H 'content-type: application/json' \
  -d '{"secret":"SEU_ADMIN_SECRET","type":"trial"}'
```

Copia o valor de `key` (começa com `OD-...`) e manda pro streamer. No app:
**LICENÇA** (chip no topo) → cola em *TENHO UMA CHAVE* → **ATIVAR**. Ele vê "Teste ativo · faltam 2 dias".

Variações:
- Trial mais longo: adicione `"days": 7`.
- Licença paga cortesia (sem cobrança): `"type":"monthly"` ou `"type":"annual"`.

> Seu `ADMIN_SECRET` está guardado no chat onde foi gerado. Se perder, gere outro em
> `vercel env add ADMIN_SECRET production --force` e redeploy.

---

## 2. Assinaturas pagas (Mercado Pago) — ✅ JÁ ATIVO

Token de produção + os **2 planos de assinatura** já estão configurados na Vercel:
- Mensal (R$ 9,99) — `preapproval_plan_id` em `MP_PLAN_MONTHLY`
- Anual (R$ 119,88) — `preapproval_plan_id` em `MP_PLAN_ANNUAL`

**Fluxo do cliente:** clica *Assinar* (landing ou app) → `/api/checkout` redireciona pro
**checkout de assinatura do Mercado Pago** (ele coloca e-mail + Pix/cartão) → volta pra
`/sucesso.html?preapproval_id=…` → a página **valida no MP e mostra a chave** → cola no app.
A chave **renova sozinha** enquanto a assinatura estiver ativa (o app chama `/refresh`, que confere no MP).

**Se um dia trocar o token** (ex: nova conta): atualize `MP_ACCESS_TOKEN`, recrie os planos
(`POST /preapproval_plan`) e atualize `MP_PLAN_MONTHLY`/`MP_PLAN_ANNUAL`, depois redeploy.

(Opcional) Webhook no MP → *Notificações* → `https://orange-delay.vercel.app/api/mp/webhook`
(evento **Assinaturas**). Não é obrigatório: a checagem ao vivo é feita pelo `/refresh`.

---

## 3. Variáveis de ambiente (Vercel, projeto `orangedelay`)

| Var | O que é |
|---|---|
| `LICENSE_PRIVATE_KEY_B64` | Chave privada Ed25519 (base64 do PEM). **Segredo.** Assina as licenças. |
| `ADMIN_SECRET` | Senha pra gerar licenças/trials via `/api/admin/mint`. **Segredo.** |
| `MP_ACCESS_TOKEN` | Access Token de produção do Mercado Pago. **Segredo.** |
| `MP_PLAN_MONTHLY` | ID do plano mensal (`preapproval_plan`). |
| `MP_PLAN_ANNUAL` | ID do plano anual (`preapproval_plan`). |
| `APP_URL` | `https://orange-delay.vercel.app` (base do `back_url`). |
| `MP_MONTHLY_AMOUNT` | (opcional) padrão `9.99` |
| `MP_ANNUAL_AMOUNT` | (opcional) padrão `119.88` |

A **chave pública** correspondente está embutida em `src/main/license.ts` (não é segredo).
Se um dia trocar o par de chaves, atualize os dois lados e gere um novo `.exe`.

---

## 4. Endpoints

| Rota | O quê |
|---|---|
| `GET /api/checkout?plan=monthly\|annual` | Cria assinatura no MP e redireciona pro checkout |
| `GET /api/license/claim?preapproval_id=…` | Após pagar, valida no MP e emite a chave (usado pela `/sucesso.html`) |
| `POST /api/license/refresh {key}` | App revalida assinatura e recebe token renovado |
| `POST /api/admin/mint {secret,type,days?,email?}` | Você gera licença/trial na mão |
| `POST /api/mp/webhook` | Recebe notificações do MP (ack) |

---

## 5. Limites honestos (MVP)
- Trava de app desktop **não é à prova de pirataria** — segura os honestos, que é o objetivo.
- A licença é um token; hoje **não há limite de dispositivos** (dá pra adicionar depois).
- O `.exe` é **não assinado** → SmartScreen pede "Executar assim mesmo" na 1ª vez.
