interface Props {
  active: boolean
}

/**
 * Decorative background flow lines that converge into the GO LIVE button.
 * Gray + idle when disconnected; light-orange flowing when connected.
 * Sits behind the button (z-0) and fades out at the far edges.
 */
export function FlowLines({ active }: Props): JSX.Element {
  return (
    <div
      className={`w-full h-full ${active ? 'fl-on' : ''}`}
      style={{
        WebkitMaskImage:
          'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)',
        maskImage: 'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)'
      }}
    >
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full" fill="none">
        {/* left -> button */}
        <path className="fl-path" d="M0 40 C 170 40, 300 100, 420 100" strokeWidth="1.5" />
        <path className="fl-path" d="M0 100 L 420 100" strokeWidth="1.5" />
        <path className="fl-path" d="M0 160 C 170 160, 300 100, 420 100" strokeWidth="1.5" />
        {/* right -> button */}
        <path className="fl-path" d="M1000 40 C 830 40, 700 100, 580 100" strokeWidth="1.5" />
        <path className="fl-path" d="M1000 100 L 580 100" strokeWidth="1.5" />
        <path className="fl-path" d="M1000 160 C 830 160, 700 100, 580 100" strokeWidth="1.5" />
        {/* connection nodes */}
        <circle className="fl-node" cx="95" cy="40" r="4" strokeWidth="1.5" />
        <circle className="fl-node" cx="95" cy="160" r="4" strokeWidth="1.5" />
        <circle className="fl-node" cx="905" cy="40" r="4" strokeWidth="1.5" />
        <circle className="fl-node" cx="905" cy="160" r="4" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
