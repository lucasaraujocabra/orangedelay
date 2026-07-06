import { useEffect, useRef, useState } from 'react'
import { Radio, Power, Circle, Clock, Zap } from 'lucide-react'
import type { RelayStatus, AppConfig } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'
import { DelayControl } from './components/DelayControl'
import { Meter } from './components/Meter'
import { SetupPanel } from './components/SetupPanel'
import { SetupWizard } from './components/SetupWizard'
import { LogConsole } from './components/LogConsole'

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(sec)}`
}

export default function App(): JSX.Element {
  const [status, setStatus] = useState<RelayStatus | null>(null)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [delay, setDelay] = useState(DEFAULT_CONFIG.delaySeconds)
  const [logs, setLogs] = useState<string[]>([])
  const [hasKey, setHasKey] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [ready, setReady] = useState(false)
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    ;(async () => {
      const cfg = await window.orange.getConfig()
      setConfig(cfg)
      setDelay(cfg.delaySeconds)
      setHasKey(!!cfg.streamKey)
      setShowWizard(!cfg.setupComplete)
      setReady(true)
      const st = await window.orange.getStatus()
      setStatus(st)
    })()

    const offStatus = window.orange.onStatus((s) => {
      setStatus(s)
      // keep the staged delay in sync if changed via hotkey/main
      setDelay((d) => (s.delaySeconds !== d && !s.pushingToTwitch ? d : s.delaySeconds))
    })
    const offLog = window.orange.onLog((line) => {
      setLogs((prev) => [...prev.slice(-200), line])
    })
    return () => {
      offStatus()
      offLog()
    }
  }, [])

  async function applyDelay(seconds: number): Promise<void> {
    setDelay(seconds)
    const applied = await window.orange.setDelay(seconds)
    setDelay(applied)
  }

  async function toggleLive(): Promise<void> {
    if (status?.pushingToTwitch || status?.state === 'RELAYING') {
      await window.orange.stopRelay()
    } else {
      const r = await window.orange.startRelay()
      if (!r.ok) setLogs((prev) => [...prev, `Não foi possível entrar no ar: ${r.error}`])
    }
  }

  const live = status?.pushingToTwitch ?? false
  const obs = status?.obsConnected ?? false
  const state = status?.state ?? 'OFFLINE'

  if (!ready) return <div className="h-full w-full bg-void" />

  if (showWizard) {
    return (
      <SetupWizard
        rtmpPort={config.rtmpPort}
        hasKey={hasKey}
        onSaveKey={async (k) => {
          await window.orange.setStreamKey(k)
          setHasKey(true)
        }}
        onTest={() => window.orange.testConnection()}
        onComplete={async () => {
          await window.orange.completeSetup()
          setShowWizard(false)
        }}
      />
    )
  }

  return (
    <div className="h-full w-full bg-void text-white flex flex-col">
      {/* ---------------------------------------------------------- header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-edge">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-energy rounded-pixel flex items-center justify-center">
            <Zap size={16} className="text-energy" fill="#FF5E1F" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg tracking-tight">
              ORANGE<span className="text-energy">DELAY</span>
            </span>
            <span className="label-mono mt-1">RELAY_RTMP // ANTI_SNIPE</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <StatusPill label="OBS" ok={obs} okText="CONECTADO" offText="AGUARDANDO" />
          <div
            className={`flex items-center gap-2 px-4 py-2 border rounded-pixel ${
              live ? 'border-live' : 'border-edge'
            }`}
          >
            <Circle
              size={10}
              className={live ? 'text-live' : 'text-muted'}
              fill={live ? '#22C55E' : 'transparent'}
            />
            <span className={`font-mono text-sm font-bold ${live ? 'text-live' : 'text-muted'}`}>
              {live ? 'NO AR' : state === 'ERROR' ? 'ERRO' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- body */}
      <div className="flex-1 grid grid-cols-[1fr_400px] min-h-0">
        {/* left column */}
        <div className="flex flex-col gap-4 p-6 overflow-y-auto">
          <div className="grid grid-cols-[1fr_auto] gap-4 items-stretch">
            <DelayControl
              delay={delay}
              effectiveDelay={status?.effectiveDelaySeconds ?? 0}
              live={live}
              onSet={applyDelay}
            />
            <div className="flex flex-col gap-4 w-[210px]">
              <div className="panel corner p-4 flex flex-col gap-1">
                <span className="label-mono flex items-center gap-2">
                  <Clock size={12} className="text-energy" /> TEMPO NO AR
                </span>
                <span className="font-mono text-2xl tabular-nums">
                  {fmtUptime(status?.uptimeSeconds ?? 0)}
                </span>
              </div>
              <Meter dir="IN" kbps={status?.bitrateInKbps ?? 0} />
              <Meter dir="OUT" kbps={status?.bitrateOutKbps ?? 0} />
            </div>
          </div>

          {/* GO LIVE */}
          <button
            onClick={toggleLive}
            className={`corner relative py-5 rounded-pixel font-mono uppercase tracking-[0.25em] font-bold text-base flex items-center justify-center gap-3 transition-colors ${
              live
                ? 'bg-surface2 border border-energy text-energy hover:bg-[#1a0d05]'
                : 'bg-energy border border-energy text-black hover:bg-[#ff7a45]'
            }`}
          >
            {live ? <Power size={18} /> : <Radio size={18} />}
            {live ? 'PARAR DELAY // SAIR DO AR' : 'ATIVAR DELAY // ENTRAR NO AR'}
          </button>
          {!hasKey && (
            <p className="font-mono text-[11px] text-energy text-center">
              Configure sua stream key da Twitch abaixo antes de entrar no ar.
            </p>
          )}
          {status?.lastError && (
            <p className="font-mono text-[11px] text-energy text-center">{status.lastError}</p>
          )}

          <SetupPanel
            hasKey={hasKey}
            rtmpPort={config.rtmpPort}
            onSaveKey={async (k) => {
              await window.orange.setStreamKey(k)
              setHasKey(true)
            }}
            onTest={() => window.orange.testConnection()}
          />
        </div>

        {/* right column: log */}
        <div className="border-l border-edge p-6 flex flex-col min-h-0">
          <LogConsole lines={logs} />
          <div className="mt-4 panel corner px-4 py-3">
            <span className="label-mono">ATALHO</span>
            <p className="font-mono text-xs text-neutral-300 mt-1">
              <span className="text-energy">Ctrl + Alt + D</span> — liga/desliga o delay
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  label,
  ok,
  okText,
  offText
}: {
  label: string
  ok: boolean
  okText: string
  offText: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="label-mono">{label}</span>
      <span className={`font-mono text-xs font-bold ${ok ? 'text-live' : 'text-muted'}`}>
        {ok ? okText : offText}
      </span>
    </div>
  )
}
