import { Minus, Plus } from 'lucide-react'
import { DELAY_PRESETS } from '../../../shared/types'

interface Props {
  delay: number
  effectiveDelay: number
  live: boolean
  onSet: (seconds: number) => void
}

export function DelayControl({ delay, effectiveDelay, live, onSet }: Props): JSX.Element {
  const step = (d: number): void => onSet(Math.max(0, delay + d))

  return (
    <div className="panel corner p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="label-mono">SEÇÃO_02 // BUFFER_DELAY</span>
        <span className="label-mono">{live ? 'APLICADO_AO_VIVO' : 'PREPARADO'}</span>
      </div>

      {/* Big number */}
      <div className="flex items-end justify-center gap-3 py-2">
        <span className="font-display font-bold text-white leading-none text-[92px] tabular-nums">
          {delay}
        </span>
        <span className="font-mono text-energy text-2xl mb-4">s</span>
      </div>
      {live && (
        <div className="text-center -mt-4">
          <span className="label-mono">
            EFETIVO_AGORA: <span className="text-energy">{effectiveDelay}s</span>
          </span>
        </div>
      )}

      {/* Presets */}
      <div className="grid grid-cols-4 gap-2">
        {DELAY_PRESETS.map((p) => {
          const active = delay === p.seconds
          return (
            <button
              key={p.label}
              onClick={() => onSet(p.seconds)}
              className={`pixel-btn flex flex-col items-center gap-1 py-3 ${
                active ? 'pixel-btn-active' : ''
              }`}
            >
              <span className="text-base font-bold tracking-normal">{p.seconds}s</span>
              <span className="text-[9px] opacity-70">{p.label}</span>
            </button>
          )
        })}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        <button onClick={() => step(-5)} className="pixel-btn flex-1 py-3">
          <Minus size={16} className="inline" /> 5
        </button>
        <button onClick={() => step(-1)} className="pixel-btn flex-1 py-3">
          <Minus size={16} className="inline" /> 1
        </button>
        <button onClick={() => step(1)} className="pixel-btn flex-1 py-3">
          <Plus size={16} className="inline" /> 1
        </button>
        <button onClick={() => step(5)} className="pixel-btn flex-1 py-3">
          <Plus size={16} className="inline" /> 5
        </button>
      </div>
    </div>
  )
}
