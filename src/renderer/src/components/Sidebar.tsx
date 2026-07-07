import {
  LayoutDashboard,
  Globe,
  MonitorPlay,
  LayoutGrid,
  SlidersHorizontal,
  HelpCircle,
  Settings,
  Zap
} from 'lucide-react'

export type Tab =
  | 'dashboard'
  | 'multistream'
  | 'overlay'
  | 'streamdeck'
  | 'setup'
  | 'help'
  | 'settings'

interface ItemDef {
  id: Tab
  label: string
  icon: typeof LayoutDashboard
  soon?: boolean
}

const MAIN: ItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'multistream', label: 'Multi-stream', icon: Globe, soon: true },
  { id: 'overlay', label: 'Overlay', icon: MonitorPlay, soon: true },
  { id: 'streamdeck', label: 'Stream Deck', icon: LayoutGrid, soon: true },
  { id: 'setup', label: 'Setup', icon: SlidersHorizontal }
]

const BOTTOM: ItemDef[] = [
  { id: 'help', label: 'Ajuda', icon: HelpCircle },
  { id: 'settings', label: 'Config', icon: Settings }
]

interface Props {
  active: Tab
  onSelect: (t: Tab) => void
}

export function Sidebar({ active, onSelect }: Props): JSX.Element {
  return (
    <aside className="w-56 shrink-0 border-r border-edge bg-surface flex flex-col">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-edge">
        <span className="w-8 h-8 border border-energy rounded-pixel grid place-items-center">
          <Zap size={16} className="text-energy" fill="#FF5E1F" />
        </span>
        <span className="font-display font-bold tracking-tight">
          ORANGE<span className="text-energy">DELAY</span>
        </span>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1">
        {MAIN.map((it) => (
          <Item key={it.id} it={it} active={active === it.id} onSelect={onSelect} />
        ))}
      </nav>

      <div className="p-3 border-t border-edge flex flex-col gap-1">
        {BOTTOM.map((it) => (
          <Item key={it.id} it={it} active={active === it.id} onSelect={onSelect} />
        ))}
      </div>
    </aside>
  )
}

function Item({
  it,
  active,
  onSelect
}: {
  it: ItemDef
  active: boolean
  onSelect: (t: Tab) => void
}): JSX.Element {
  const Icon = it.icon
  return (
    <button
      onClick={() => onSelect(it.id)}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-pixel font-mono text-sm transition-colors ${
        active ? 'bg-[#1a0d05] text-energy' : 'text-muted hover:text-white hover:bg-surface2'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-energy rounded-full" />
      )}
      <Icon size={17} strokeWidth={1.6} />
      <span className="flex-1 text-left">{it.label}</span>
      {it.soon && (
        <span className="text-[8px] font-mono uppercase tracking-wider text-muted border border-edge px-1 py-0.5 rounded-pixel">
          soon
        </span>
      )}
    </button>
  )
}
