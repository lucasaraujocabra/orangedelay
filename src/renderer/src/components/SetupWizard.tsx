import { useState } from 'react'
import {
  Zap,
  KeyRound,
  Eye,
  EyeOff,
  MonitorPlay,
  PlugZap,
  Loader2,
  Check,
  X,
  Copy,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'

interface Props {
  rtmpPort: number
  hasKey: boolean
  onSaveKey: (key: string) => Promise<void>
  onTest: () => Promise<{ ok: boolean; error?: string }>
  onComplete: () => void
}

const STEPS = ['BEM_VINDO', 'STREAM_KEY', 'CONFIG_OBS', 'PRONTO'] as const

export function SetupWizard({ rtmpPort, hasKey, onSaveKey, onTest, onComplete }: Props): JSX.Element {
  const [step, setStep] = useState(0)
  const [key, setKey] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saved, setSaved] = useState(hasKey)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const serverUrl = `rtmp://localhost:${rtmpPort}/live`

  async function saveKey(): Promise<void> {
    if (!key.trim()) return
    await onSaveKey(key.trim())
    setSaved(true)
    setStep(2)
  }

  async function test(): Promise<void> {
    setTesting(true)
    setResult(null)
    setResult(await onTest())
    setTesting(false)
  }

  return (
    <div className="h-full w-full bg-void text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-[640px] flex flex-col gap-8">
        {/* brand + step marker */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border border-energy rounded-pixel flex items-center justify-center">
              <Zap size={18} className="text-energy" fill="#FF5E1F" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">
              ORANGE<span className="text-energy">DELAY</span>
            </span>
          </div>
          <span className="label-mono">
            PASSO_{String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')} //{' '}
            {STEPS[step]}
          </span>
        </div>

        {/* progress ticks */}
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-pixel ${i <= step ? 'bg-energy' : 'bg-edge'}`}
            />
          ))}
        </div>

        {/* body */}
        <div className="panel corner p-8 min-h-[300px] flex flex-col">
          {step === 0 && (
            <div className="flex flex-col gap-6 flex-1">
              <div className="flex items-center gap-3">
                <ShieldCheck size={26} className="text-energy" strokeWidth={1.5} />
                <h1 className="font-display font-bold text-2xl">Relay anti stream-sniping</h1>
              </div>
              <p className="font-mono text-sm text-neutral-300 leading-relaxed">
                O OrangeDelay fica entre o OBS e a Twitch. Ele segura sua transmissão num buffer
                e reenvia com o delay que você controla — e você muda esse delay{' '}
                <span className="text-energy">ao vivo</span>, sem reiniciar o OBS. Snipers
                assistem sua stream no passado; você joga no presente.
              </p>
              <div className="border border-edge bg-void rounded-pixel p-4 font-mono text-xs text-muted leading-relaxed">
                OBS <span className="text-energy">──▶</span> rtmp://localhost:{rtmpPort}/live{' '}
                <span className="text-energy">──▶</span> buffer + delay{' '}
                <span className="text-energy">──▶</span> Twitch
              </div>
              <div className="mt-auto flex justify-end">
                <button onClick={() => setStep(1)} className="pixel-btn-primary px-6 py-3">
                  COMEÇAR <ArrowRight size={15} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5 flex-1">
              <div className="flex items-center gap-3">
                <KeyRound size={22} className="text-energy" strokeWidth={1.5} />
                <h1 className="font-display font-bold text-xl">Cole sua stream key da Twitch</h1>
              </div>
              <p className="font-mono text-xs text-muted leading-relaxed">
                Pegue em dashboard.twitch.tv → Configurações → Transmissão → Chave de transmissão
                principal. Fica salva localmente e é exibida mascarada.
              </p>
              <div className="flex items-center border border-edge bg-void rounded-pixel">
                <input
                  autoFocus
                  type={reveal ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value)
                    setSaved(false)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                  placeholder={hasKey ? '•••••• salva — cole para substituir' : 'live_xxxxxxxxxxxxxxxxxxxx'}
                  className="flex-1 bg-transparent px-4 py-3 font-mono text-sm outline-none placeholder:text-muted"
                />
                <button onClick={() => setReveal((v) => !v)} className="px-3 text-muted hover:text-energy">
                  {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mt-auto flex justify-between">
                <button onClick={() => setStep(0)} className="pixel-btn">
                  VOLTAR
                </button>
                <button
                  onClick={saveKey}
                  disabled={!key.trim() && !hasKey}
                  className="pixel-btn-primary px-6 py-3 disabled:opacity-40"
                >
                  {hasKey && !key.trim() ? 'MANTER KEY SALVA' : 'SALVAR KEY'}{' '}
                  <ArrowRight size={15} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5 flex-1">
              <div className="flex items-center gap-3">
                <MonitorPlay size={22} className="text-energy" strokeWidth={1.5} />
                <h1 className="font-display font-bold text-xl">Aponte o OBS pro OrangeDelay</h1>
              </div>
              <p className="font-mono text-xs text-muted leading-relaxed">
                OBS → Configurações → Transmissão → Serviço:{' '}
                <span className="text-white">Personalizado...</span>
              </p>
              <div className="border border-edge bg-void rounded-pixel divide-y divide-edge">
                <ConfigRow label="SERVIDOR" value={serverUrl} />
                <ConfigRow label="STREAM KEY" value="qualquer valor (ex: obs)" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={test} disabled={testing} className="pixel-btn disabled:opacity-40">
                  {testing ? (
                    <Loader2 size={13} className="inline animate-spin mr-2" />
                  ) : (
                    <PlugZap size={13} className="inline mr-2" />
                  )}
                  TESTAR CONEXÃO TWITCH
                </button>
                {result && (
                  <span
                    className={`font-mono text-xs flex items-center gap-1 ${
                      result.ok ? 'text-live' : 'text-energy'
                    }`}
                  >
                    {result.ok ? <Check size={14} /> : <X size={14} />}
                    {result.ok ? 'OK — key válida' : result.error}
                  </span>
                )}
              </div>
              <div className="mt-auto flex justify-between">
                <button onClick={() => setStep(1)} className="pixel-btn">
                  VOLTAR
                </button>
                <button onClick={() => setStep(3)} className="pixel-btn-primary px-6 py-3">
                  CONTINUAR <ArrowRight size={15} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 flex-1">
              <div className="flex items-center gap-3">
                <Check size={24} className="text-live" strokeWidth={2} />
                <h1 className="font-display font-bold text-xl">Tudo pronto</h1>
              </div>
              <ul className="font-mono text-xs text-neutral-300 leading-relaxed space-y-2">
                <li>
                  <span className="text-energy mr-2">›</span>Comece a transmitir no OBS pro servidor
                  personalizado acima.
                </li>
                <li>
                  <span className="text-energy mr-2">›</span>Escolha um delay e clique em ATIVAR
                  DELAY // ENTRAR NO AR.
                </li>
                <li>
                  <span className="text-energy mr-2">›</span>Mude o delay quando quiser — ao vivo. O
                  atalho <span className="text-energy">Ctrl+Alt+D</span> liga/desliga.
                </li>
              </ul>
              <div className="mt-auto flex justify-end">
                <button onClick={onComplete} className="pixel-btn-primary px-8 py-3">
                  ABRIR O PAINEL <ArrowRight size={15} className="inline ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={onComplete} className="label-mono hover:text-energy self-center">
          PULAR_CONFIG
        </button>
      </div>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="label-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-white">{value}</span>
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-muted hover:text-energy"
          title="copy"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  )
}
