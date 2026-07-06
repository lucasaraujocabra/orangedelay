import { useState } from 'react'
import { KeyRound, Eye, EyeOff, PlugZap, Loader2, Check, X } from 'lucide-react'

interface Props {
  hasKey: boolean
  onSaveKey: (key: string) => Promise<void>
  onTest: () => Promise<{ ok: boolean; error?: string }>
}

export function KeyPanel({ hasKey, onSaveKey, onTest }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saved, setSaved] = useState(hasKey)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)

  async function save(): Promise<void> {
    if (!key.trim()) return
    await onSaveKey(key.trim())
    setSaved(true)
    setResult(null)
  }

  async function test(): Promise<void> {
    setTesting(true)
    setResult(null)
    setResult(await onTest())
    setTesting(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs text-muted leading-relaxed">
        Cole a chave de transmissão da Twitch (dashboard.twitch.tv → Configurações → Transmissão).
        Fica salva localmente e mascarada. É com ela que o app envia pra Twitch.
      </p>

      <div className="flex flex-col gap-2">
        <span className="label-mono flex items-center gap-2">
          <KeyRound size={12} className="text-energy" /> CHAVE_DA_TWITCH
        </span>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-edge bg-void rounded-pixel">
            <input
              autoFocus
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setSaved(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={hasKey && !key ? '•••••••••• salva — cole para substituir' : 'live_xxxxxxxxxxxxxxxxxxxx'}
              className="flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-muted"
            />
            <button onClick={() => setReveal((v) => !v)} className="px-3 text-muted hover:text-energy">
              {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button onClick={save} className="pixel-btn">
            SALVAR
          </button>
        </div>
        {saved && (
          <span className="label-mono !text-live flex items-center gap-1">
            <Check size={12} /> KEY_SALVA
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-edge pt-4">
        <button onClick={test} disabled={testing || !saved} className="pixel-btn disabled:opacity-40">
          {testing ? (
            <Loader2 size={13} className="inline animate-spin mr-2" />
          ) : (
            <PlugZap size={13} className="inline mr-2" />
          )}
          TESTAR CONEXÃO
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
    </div>
  )
}
