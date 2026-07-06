import { useState } from 'react'
import { KeyRound, Eye, EyeOff, PlugZap, Loader2, Check, X, Copy } from 'lucide-react'

interface Props {
  hasKey: boolean
  onSaveKey: (key: string) => Promise<void>
  onTest: () => Promise<{ ok: boolean; error?: string }>
  rtmpPort: number
}

export function SetupPanel({ hasKey, onSaveKey, onTest, rtmpPort }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saved, setSaved] = useState(hasKey)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const serverUrl = `rtmp://localhost:${rtmpPort}/live`

  async function save(): Promise<void> {
    if (!key.trim()) return
    await onSaveKey(key.trim())
    setSaved(true)
    setResult(null)
  }

  async function test(): Promise<void> {
    setTesting(true)
    setResult(null)
    const r = await onTest()
    setResult(r)
    setTesting(false)
  }

  return (
    <div className="panel corner p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="label-mono">SEÇÃO_03 // CONFIG</span>
        <span className="label-mono">{saved ? 'KEY_SALVA' : 'SEM_KEY'}</span>
      </div>

      {/* Stream key */}
      <div className="flex flex-col gap-2">
        <span className="label-mono flex items-center gap-2">
          <KeyRound size={12} className="text-energy" /> TWITCH_STREAM_KEY
        </span>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center border border-edge bg-void rounded-pixel">
            <input
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setSaved(false)
              }}
              placeholder={hasKey && !key ? '•••••••••• salva — cole para substituir' : 'live_xxxxxxxxxxxxxxxxxxxx'}
              className="flex-1 bg-transparent px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-muted"
            />
            <button
              onClick={() => setReveal((v) => !v)}
              className="px-3 text-muted hover:text-energy"
              title="toggle visibility"
            >
              {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button onClick={save} className="pixel-btn">
            SALVAR
          </button>
        </div>
      </div>

      {/* OBS instructions */}
      <div className="flex flex-col gap-2">
        <span className="label-mono">OBS // CONFIG → TRANSMISSÃO → SERVIDOR PERSONALIZADO</span>
        <div className="border border-edge bg-void rounded-pixel divide-y divide-edge">
          <Row label="SERVIDOR" value={serverUrl} />
          <Row label="STREAM KEY" value="qualquer valor (ex: obs)" mono />
        </div>
        <p className="font-mono text-[11px] text-muted leading-relaxed">
          Aponte o OBS pro OrangeDelay, não pra Twitch. O app segura a transmissão no buffer e
          reenvia pra Twitch com o delay escolhido, usando a key salva acima.
        </p>
      </div>

      {/* Test */}
      <div className="flex items-center gap-3">
        <button onClick={test} disabled={testing || !saved} className="pixel-btn disabled:opacity-40">
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
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="label-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm text-white ${mono ? 'font-mono' : 'font-mono'}`}>{value}</span>
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
