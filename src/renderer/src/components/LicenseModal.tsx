import { useState } from 'react'
import { KeyRound, Check, Loader2, ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react'
import type { LicenseStatus } from '../../../shared/types'

interface Props {
  status: LicenseStatus
  onSetKey: (key: string) => Promise<LicenseStatus>
  onCheckout: (plan: 'monthly' | 'annual') => void
  onChange: (s: LicenseStatus) => void
}

const PLAN_LABEL: Record<string, string> = {
  trial: 'Teste',
  monthly: 'Mensal',
  annual: 'Anual'
}

export function LicenseModal({ status, onSetKey, onCheckout, onChange }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function activate(): Promise<void> {
    if (!key.trim()) return
    setSaving(true)
    setErr(null)
    const s = await onSetKey(key.trim())
    setSaving(false)
    if (s.active) {
      onChange(s)
      setKey('')
    } else {
      setErr(s.state === 'invalid' ? 'Chave inválida.' : 'Chave expirada ou inativa.')
      onChange(s)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* status atual */}
      <div
        className={`corner border rounded-pixel p-4 flex items-center gap-3 ${
          status.active ? 'border-live/50 bg-[#0c1a0f]' : 'border-energy/50 bg-[#140a05]'
        }`}
      >
        {status.active ? (
          <ShieldCheck size={20} className="text-live shrink-0" />
        ) : (
          <ShieldAlert size={20} className="text-energy shrink-0" />
        )}
        <div className="font-mono text-sm">
          {status.active ? (
            <>
              <span className="text-white font-bold">
                {status.plan === 'trial' ? 'Teste ativo' : `Assinatura ${PLAN_LABEL[status.plan || '']} ativa`}
              </span>
              {status.daysLeft != null && (
                <span className="text-neutral-400">
                  {' '}
                  · {status.daysLeft === 1 ? 'falta 1 dia' : `faltam ${status.daysLeft} dias`}
                </span>
              )}
            </>
          ) : (
            <span className="text-neutral-300">
              {status.state === 'expired' ? 'Licença expirada.' : 'Sem licença ativa.'} Assine ou
              cole uma chave de teste pra entrar no ar.
            </span>
          )}
        </div>
      </div>

      {/* colar chave / trial */}
      <div className="flex flex-col gap-2">
        <span className="label-mono flex items-center gap-2">
          <KeyRound size={12} className="text-energy" /> TENHO UMA CHAVE (ou teste de 2 dias)
        </span>
        <div className="flex gap-2">
          <input
            value={key}
            onChange={(e) => {
              setKey(e.target.value)
              setErr(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && activate()}
            placeholder="OD-..."
            className="flex-1 bg-void border border-edge rounded-pixel px-3 py-2.5 font-mono text-xs text-white outline-none placeholder:text-muted focus:border-energy"
          />
          <button onClick={activate} disabled={saving || !key.trim()} className="pixel-btn disabled:opacity-40">
            {saving ? <Loader2 size={13} className="inline animate-spin" /> : 'ATIVAR'}
          </button>
        </div>
        {err && <span className="font-mono text-xs text-energy">{err}</span>}
      </div>

      {/* assinar */}
      <div className="border-t border-edge pt-5">
        <span className="label-mono">ASSINAR — PIX OU CARTÃO</span>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => onCheckout('monthly')}
            className="border border-edge rounded-pixel p-4 text-left hover:border-energy transition group"
          >
            <div className="label-mono">MENSAL</div>
            <div className="font-bold text-2xl mt-1">
              R$ 9,99<span className="text-muted text-xs font-mono">/mês</span>
            </div>
            <span className="label-mono !text-energy flex items-center gap-1 mt-2">
              ASSINAR <ExternalLink size={11} />
            </span>
          </button>
          <button
            onClick={() => onCheckout('annual')}
            className="border border-energy rounded-pixel p-4 text-left bg-[#140a05] hover:bg-[#1a0d05] transition"
          >
            <div className="label-mono !text-energy">ANUAL</div>
            <div className="font-bold text-2xl mt-1">
              R$ 119,88<span className="text-muted text-xs font-mono">/ano</span>
            </div>
            <span className="label-mono !text-energy flex items-center gap-1 mt-2">
              ASSINAR <ExternalLink size={11} />
            </span>
          </button>
        </div>
        <p className="font-mono text-[11px] text-muted mt-3 leading-relaxed">
          Ao assinar, você recebe a chave na página de sucesso — cole ela aqui em cima. Ela renova
          sozinha enquanto a assinatura estiver ativa.
        </p>
      </div>
    </div>
  )
}
