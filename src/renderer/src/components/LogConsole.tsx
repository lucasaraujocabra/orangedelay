import { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

export function LogConsole({ lines }: { lines: string[] }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight)
  }, [lines])

  return (
    <div className="panel corner flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-edge">
        <Terminal size={13} className="text-energy" />
        <span className="label-mono">LOG_SISTEMA</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[11px] leading-relaxed">
        {lines.length === 0 && <span className="text-muted">aguardando eventos…</span>}
        {lines.map((l, i) => (
          <div key={i} className="text-neutral-400">
            <span className="text-energy-dim mr-2">›</span>
            {l}
          </div>
        ))}
      </div>
    </div>
  )
}
