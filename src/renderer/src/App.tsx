import { useEffect, useRef, useState } from 'react'
import {
  Radio,
  Power,
  Circle,
  Clock,
  Zap,
  KeyRound,
  MonitorPlay,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react'
import type { RelayStatus, AppConfig } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'
import { DelayControl } from './components/DelayControl'
import { FlowLines } from './components/FlowLines'
import { KeyPanel } from './components/KeyPanel'
import { ObsGuide } from './components/ObsGuide'
import { SetupWizard } from './components/SetupWizard'
import { Modal } from './components/Modal'

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
  const [hasKey, setHasKey] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [ready, setReady] = useState(false)
  const [modal, setModal] = useState<null | 'key' | 'obs'>(null)
  const [startError, setStartError] = useState<string | null>(null)
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
      setStatus(await window.orange.getStatus())
    })()

    const offStatus = window.orange.onStatus((s) => {
      setStatus(s)
      setDelay((d) => (s.pushingToTwitch ? s.delaySeconds : d))
    })
    return () => offStatus()
  }, [])

  async function applyDelay(seconds: number): Promise<void> {
    setDelay(seconds)
    setDelay(await window.orange.setDelay(seconds))
  }

  async function toggleLive(): Promise<void> {
    setStartError(null)
    if (status?.pushingToTwitch || status?.state === 'RELAYING') {
      await window.orange.stopRelay()
    } else {
      const r = await window.orange.startRelay()
      if (!r.ok) setStartError(r.error ?? 'Não foi possível entrar no ar.')
    }
  }

  const live = status?.pushingToTwitch ?? false
  const obs = status?.obsConnected ?? false
  const state = status?.state ?? 'OFFLINE'
  const err = startError || status?.lastError

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

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="label-mono">OBS</span>
            <span className={`font-mono text-xs font-bold ${obs ? 'text-live' : 'text-muted'}`}>
              {obs ? 'CONECTADO' : 'AGUARDANDO'}
            </span>
          </div>
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

      {/* ---------------------------------------------------------- body (centered) */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-6 relative">
          <div className="pointer-events-none absolute top-[22%] left-1/2 -translate-x-1/2 w-[520px] h-[300px] bg-energy/10 blur-[140px] rounded-full" />

          <div className="relative isolate w-full max-w-md flex flex-col gap-5">
            <DelayControl
              delay={delay}
              effectiveDelay={status?.effectiveDelaySeconds ?? 0}
              live={live}
              onSet={applyDelay}
            />

            {/* GO LIVE — com linhas de fluxo animadas no fundo */}
            <div className="relative py-6">
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] max-w-[94vw] h-[200px] -z-10">
                <FlowLines active={obs || live} />
              </div>
              <button
                onClick={toggleLive}
                className={`corner relative z-10 w-full py-5 rounded-pixel font-mono uppercase tracking-[0.22em] font-bold text-base flex items-center justify-center gap-3 transition-colors ${
                  live
                    ? 'bg-surface2 border border-energy text-energy hover:bg-[#1a0d05]'
                    : 'bg-energy border border-energy text-black hover:bg-[#ff7a45]'
                }`}
              >
                {live ? <Power size={18} /> : <Radio size={18} />}
                {live ? 'SAIR DO AR' : 'ENTRAR NO AR'}
              </button>
            </div>

            {!hasKey && (
              <button
                onClick={() => setModal('key')}
                className="font-mono text-[11px] text-energy text-center hover:underline"
              >
                Configure sua chave da Twitch antes de entrar no ar →
              </button>
            )}
            {err && <p className="font-mono text-[11px] text-energy text-center">{err}</p>}

            {/* stats */}
            <div className="grid grid-cols-3 gap-3">
              <Stat
                icon={<ArrowDownToLine size={12} />}
                label="IN"
                value={status?.bitrateInKbps ? status.bitrateInKbps.toLocaleString() : '—'}
                unit="kbps"
                active={!!status?.bitrateInKbps}
              />
              <Stat
                icon={<ArrowUpFromLine size={12} />}
                label="OUT"
                value={status?.bitrateOutKbps ? status.bitrateOutKbps.toLocaleString() : '—'}
                unit="kbps"
                active={!!status?.bitrateOutKbps}
              />
              <Stat
                icon={<Clock size={12} />}
                label="NO AR"
                value={fmtUptime(status?.uptimeSeconds ?? 0)}
                active={live}
              />
            </div>

            {/* secondary actions -> modals */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setModal('key')}
                className="pixel-btn flex items-center justify-center gap-2 py-3 relative"
              >
                <KeyRound size={15} />
                CHAVE DA TWITCH
                <span
                  className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                    hasKey ? 'bg-live' : 'bg-energy'
                  }`}
                />
              </button>
              <button
                onClick={() => setModal('obs')}
                className="pixel-btn flex items-center justify-center gap-2 py-3"
              >
                <MonitorPlay size={15} />
                CONFIGURAR NO OBS
              </button>
            </div>

            <p className="label-mono text-center">
              ATALHO GLOBAL · <span className="text-energy">CTRL + ALT + D</span> LIGA/DESLIGA
            </p>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------------- modals */}
      {modal === 'key' && (
        <Modal title="Chave da Twitch" tag="ORANGEDELAY // CONFIG" onClose={() => setModal(null)}>
          <KeyPanel
            hasKey={hasKey}
            onSaveKey={async (k) => {
              await window.orange.setStreamKey(k)
              setHasKey(true)
            }}
            onTest={() => window.orange.testConnection()}
          />
        </Modal>
      )}
      {modal === 'obs' && (
        <Modal title="Como configurar no OBS" tag="ORANGEDELAY // GUIA" onClose={() => setModal(null)}>
          <ObsGuide rtmpPort={config.rtmpPort} />
        </Modal>
      )}
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  unit,
  active
}: {
  icon: JSX.Element
  label: string
  value: string
  unit?: string
  active?: boolean
}): JSX.Element {
  return (
    <div className="border border-edge rounded-pixel bg-surface px-3 py-2.5 flex flex-col gap-1">
      <span className={`label-mono flex items-center gap-1.5 ${active ? '!text-energy' : ''}`}>
        {icon}
        {label}
      </span>
      <span className="font-mono text-base tabular-nums text-white leading-none">
        {value}
        {unit && <span className="text-muted text-[10px] ml-1">{unit}</span>}
      </span>
    </div>
  )
}
