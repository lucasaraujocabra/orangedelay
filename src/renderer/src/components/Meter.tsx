import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

interface Props {
  dir: 'IN' | 'OUT'
  kbps: number
}

export function Meter({ dir, kbps }: Props): JSX.Element {
  const Icon = dir === 'IN' ? ArrowDownToLine : ArrowUpFromLine
  const active = kbps > 0
  return (
    <div className="panel corner px-4 py-3 flex items-center gap-3">
      <Icon size={16} className={active ? 'text-energy' : 'text-muted'} strokeWidth={1.5} />
      <div className="flex flex-col">
        <span className="label-mono">{dir === 'IN' ? 'TAXA_ENTRADA' : 'TAXA_SAÍDA'}</span>
        <span className="font-mono text-lg text-white leading-none mt-1">
          {active ? kbps.toLocaleString() : '—'}
          <span className="text-muted text-xs ml-1">kbps</span>
        </span>
      </div>
    </div>
  )
}
