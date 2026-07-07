import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Radio,
  Power,
  Circle,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  ShieldAlert,
  Twitch,
  Youtube,
  Layers,
  Keyboard,
  Zap
} from 'lucide-react'
import type { RelayStatus, AppConfig, LicenseStatus } from '../../shared/types'
import { DEFAULT_CONFIG } from '../../shared/types'
import { DelayControl } from './components/DelayControl'
import { FlowLines } from './components/FlowLines'
import { KeyPanel } from './components/KeyPanel'
import { ObsGuide } from './components/ObsGuide'
import { LicenseModal } from './components/LicenseModal'
import { SetupWizard } from './components/SetupWizard'
import { Sidebar, type Tab } from './components/Sidebar'

const PLAN_SHORT: Record<string, string> = { trial: 'TESTE', monthly: 'MENSAL', annual: 'ANUAL' }

function fmtUptime(s: number): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`
}

export default function App(): JSX.Element {
  const [status, setStatus] = useState<RelayStatus | null>(null)
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [delay, setDelay] = useState(DEFAULT_CONFIG.delaySeconds)
  const [hasKey, setHasKey] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [ready, setReady] = useState(false)
  const [license, setLicense] = useState<LicenseStatus | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('dashboard')
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
      setLicense(await window.orange.getLicense())
      setReady(true)
      setStatus(await window.orange.getStatus())
      window.orange.refreshLicense().then(setLicense)
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
      return
    }
    if (!license?.active) {
      setTab('settings')
      return
    }
    const r = await window.orange.startRelay()
    if (!r.ok) setStartError(r.error ?? 'Não foi possível entrar no ar.')
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
    <div className="h-full w-full bg-void text-white flex">
      <Sidebar active={tab} onSelect={setTab} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* top bar */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-edge shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-pixel ${
              live ? 'border-live' : 'border-edge'
            }`}
          >
            <Circle
              size={9}
              className={live ? 'text-live' : 'text-muted'}
              fill={live ? '#22C55E' : 'transparent'}
            />
            <span className={`font-mono text-xs font-bold ${live ? 'text-live' : 'text-muted'}`}>
              {live ? 'NO AR · COM DELAY' : state === 'ERROR' ? 'ERRO' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MiniStat icon={<ArrowDownToLine size={11} />} label="IN" value={fmtBitrate(status?.bitrateInKbps)} active={!!status?.bitrateInKbps} />
            <MiniStat icon={<ArrowUpFromLine size={11} />} label="OUT" value={fmtBitrate(status?.bitrateOutKbps)} active={!!status?.bitrateOutKbps} />
            <MiniStat icon={<Clock size={11} />} label="" value={fmtUptime(status?.uptimeSeconds ?? 0)} active={live} />
            <button
              onClick={() => setTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-pixel ml-1 ${
                license?.active ? 'border-edge hover:border-live' : 'border-energy/60 hover:border-energy'
              }`}
            >
              {license?.active ? (
                <ShieldCheck size={12} className="text-live" />
              ) : (
                <ShieldAlert size={12} className="text-energy" />
              )}
              <span className={`font-mono text-[11px] font-bold ${license?.active ? 'text-white' : 'text-energy'}`}>
                {license?.active
                  ? license.plan === 'trial'
                    ? `TESTE · ${license.daysLeft}d`
                    : PLAN_SHORT[license.plan || '']
                  : 'SEM LICENÇA'}
              </span>
            </button>
          </div>
        </div>

        {/* content */}
        <main className="flex-1 overflow-y-auto">
          {tab === 'dashboard' && (
            <DashboardView
              delay={delay}
              status={status}
              live={live}
              obs={obs}
              licensed={!!license?.active}
              startError={startError}
              onSet={applyDelay}
              onToggle={toggleLive}
              onLicense={() => setTab('settings')}
            />
          )}

          {tab === 'setup' && (
            <TabView title="Setup" subtitle="Configure o OBS e a chave da Twitch">
              <div className="flex flex-col gap-4 max-w-2xl">
                <div className="panel corner p-5">
                  <span className="label-mono">SEÇÃO // CHAVE DA TWITCH</span>
                  <div className="mt-4">
                    <KeyPanel
                      hasKey={hasKey}
                      onSaveKey={async (k) => {
                        await window.orange.setStreamKey(k)
                        setHasKey(true)
                      }}
                      onTest={() => window.orange.testConnection()}
                    />
                  </div>
                </div>
                <div className="panel corner p-5">
                  <ObsGuide rtmpPort={config.rtmpPort} />
                </div>
              </div>
            </TabView>
          )}

          {tab === 'settings' && (
            <TabView title="Config" subtitle="Licença, assinatura e app">
              <div className="max-w-2xl panel corner p-5">
                <LicenseModal
                  status={license ?? { active: false, plan: null, state: 'none', expiresAt: null, daysLeft: null }}
                  onSetKey={(k) => window.orange.setLicenseKey(k)}
                  onCheckout={(p) => window.orange.openCheckout(p)}
                  onPix={(p) => window.orange.openPix(p)}
                  onChange={setLicense}
                />
              </div>
              <p className="label-mono mt-4">ORANGEDELAY · MVP</p>
            </TabView>
          )}

          {tab === 'help' && (
            <TabView title="Ajuda" subtitle="Atalhos e suporte">
              <div className="max-w-2xl flex flex-col gap-4">
                <div className="panel corner p-5 flex items-center gap-3">
                  <Keyboard size={18} className="text-energy" />
                  <div className="font-mono text-sm">
                    <span className="text-energy">Ctrl + Alt + D</span>
                    <span className="text-neutral-400"> — liga/desliga o delay de dentro do jogo</span>
                  </div>
                </div>
                <div className="panel corner p-5 font-mono text-sm text-neutral-400 leading-relaxed">
                  Mantenha o OrangeDelay aberto em segundo plano durante toda a live. Ele é quem
                  recebe do OBS e envia pra Twitch — se fechar, a stream cai.
                </div>
              </div>
            </TabView>
          )}

          {(tab === 'multistream' || tab === 'overlay' || tab === 'streamdeck') && (
            <ComingSoon tab={tab} />
          )}
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ views */

function DashboardView({
  delay,
  status,
  live,
  obs,
  licensed,
  startError,
  onSet,
  onToggle,
  onLicense
}: {
  delay: number
  status: RelayStatus | null
  live: boolean
  obs: boolean
  licensed: boolean
  startError: string | null
  onSet: (s: number) => void
  onToggle: () => void
  onLicense: () => void
}): JSX.Element {
  const err = startError || status?.lastError
  const twitchState = live ? 'NO AR' : obs ? 'PRONTO' : 'AGUARDANDO'
  return (
    <div className="p-8 flex flex-col items-center">
      <div className="w-full max-w-lg flex flex-col gap-5 isolate">
        {/* mode toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex border border-edge rounded-pixel overflow-hidden font-mono text-xs">
            <span className="px-4 py-2 bg-[#1a0d05] text-energy font-bold uppercase tracking-wider">
              Modo instantâneo
            </span>
            <span className="px-4 py-2 text-muted uppercase tracking-wider flex items-center gap-1.5">
              Overlay <span className="text-[8px] border border-edge px-1 rounded-pixel">soon</span>
            </span>
          </div>
        </div>

        <DelayControl delay={delay} effectiveDelay={status?.effectiveDelaySeconds ?? 0} live={live} onSet={onSet} />

        {/* GO LIVE + flow lines */}
        <div className="relative py-6">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[90vw] h-[190px] -z-10">
            <FlowLines active={obs || live} />
          </div>
          <button
            onClick={onToggle}
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

        {!licensed && (
          <button onClick={onLicense} className="font-mono text-[11px] text-energy text-center hover:underline -mt-2">
            Ative sua licença ou use um teste de 2 dias →
          </button>
        )}
        {err && <p className="font-mono text-[11px] text-energy text-center -mt-2">{err}</p>}

        {/* plataformas */}
        <div className="mt-2">
          <span className="label-mono">PLATAFORMAS DE TRANSMISSÃO</span>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <PlatformCard
              name="Twitch"
              icon={<Twitch size={16} />}
              state={twitchState}
              stateColor={live ? 'text-live' : obs ? 'text-energy' : 'text-muted'}
              delay={live ? `${status?.effectiveDelaySeconds ?? 0}s` : '—'}
              active
            />
            <PlatformCard name="YouTube" icon={<Youtube size={16} />} state="EM BREVE" stateColor="text-muted" delay="—" />
            <PlatformCard name="Kick" icon={<Radio size={16} />} state="EM BREVE" stateColor="text-muted" delay="—" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PlatformCard({
  name,
  icon,
  state,
  stateColor,
  delay,
  active
}: {
  name: string
  icon: JSX.Element
  state: string
  stateColor: string
  delay: string
  active?: boolean
}): JSX.Element {
  return (
    <div className={`border rounded-pixel bg-surface p-3 ${active ? 'border-edge' : 'border-edge opacity-60'}`}>
      <div className="flex items-center gap-2">
        <span className={active ? 'text-energy' : 'text-muted'}>{icon}</span>
        <span className="font-mono text-xs font-bold">{name}</span>
      </div>
      <div className={`font-mono text-[10px] uppercase tracking-wider mt-2 ${stateColor}`}>{state}</div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-edge">
        <span className="label-mono">DELAY</span>
        <span className="font-mono text-xs text-white">{delay}</span>
      </div>
    </div>
  )
}

function ComingSoon({ tab }: { tab: Tab }): JSX.Element {
  const meta: Record<string, { title: string; desc: string }> = {
    multistream: {
      title: 'Multi-stream',
      desc: 'Transmita pra Twitch, YouTube e Kick ao mesmo tempo — cada uma com seu próprio delay. Chegando em breve.'
    },
    overlay: {
      title: 'Overlay',
      desc: 'Um contador de delay na tela pra você e sua audiência. Chegando em breve.'
    },
    streamdeck: {
      title: 'Stream Deck',
      desc: 'Controle o delay direto do seu Stream Deck. Chegando em breve.'
    }
  }
  const m = meta[tab]
  return (
    <div className="h-full grid place-items-center p-8">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 mx-auto border border-energy rounded-pixel grid place-items-center">
          <Layers size={24} className="text-energy" strokeWidth={1.5} />
        </div>
        <h2 className="font-display font-bold text-2xl mt-5">{m.title}</h2>
        <span className="label-mono !text-energy">EM BREVE</span>
        <p className="font-mono text-sm text-neutral-400 mt-4 leading-relaxed">{m.desc}</p>
      </div>
    </div>
  )
}

function TabView({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Zap size={18} className="text-energy" fill="#FF5E1F" />
        <div>
          <h1 className="font-display font-bold text-xl leading-none">{title}</h1>
          <span className="label-mono">{subtitle}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  active
}: {
  icon: JSX.Element
  label: string
  value: string
  active?: boolean
}): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-edge rounded-pixel">
      <span className={active ? 'text-energy' : 'text-muted'}>{icon}</span>
      {label && <span className="label-mono">{label}</span>}
      <span className="font-mono text-[11px] text-white tabular-nums">{value}</span>
    </div>
  )
}

function fmtBitrate(kbps?: number): string {
  return kbps ? kbps.toLocaleString() : '—'
}
