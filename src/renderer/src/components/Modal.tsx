import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  tag?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, tag, onClose, children }: Props): JSX.Element {
  useEffect(() => {
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: 'fadeIn .15s ease' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg max-h-[86vh] overflow-y-auto border border-edge bg-surface rounded-pixel"
        style={{ animation: 'popIn .18s cubic-bezier(.16,1,.3,1)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-edge bg-surface">
          <div className="flex flex-col">
            {tag && <span className="label-mono">{tag}</span>}
            <h2 className="font-display font-bold text-lg mt-0.5">{title}</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-energy p-1" title="fechar (Esc)">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
