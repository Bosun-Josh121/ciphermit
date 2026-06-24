interface Props {
  className?: string
  /** Hairline stroke color, defaults to currentColor so callers can set via text color util */
  stroke?: string
  opacity?: number
  rings?: number
}

/**
 * Procedural guilloché-style interference pattern: layered, rotated ellipses
 * approximate the interwoven engraved line-work of banknote security print.
 * Used at low opacity as a watermark, or framed tightly as a document border motif.
 */
export function Guilloche({ className = '', stroke = 'currentColor', opacity = 1, rings = 7 }: Props) {
  const paths = Array.from({ length: rings }, (_, i) => {
    const rx = 30 + i * 9
    const ry = 18 + i * 6
    const rotation = (i * 180) / rings
    return (
      <ellipse
        key={i}
        cx="100"
        cy="100"
        rx={rx}
        ry={ry}
        fill="none"
        stroke={stroke}
        strokeWidth="0.4"
        transform={`rotate(${rotation} 100 100)`}
      />
    )
  })
  const paths2 = Array.from({ length: rings }, (_, i) => {
    const rx = 30 + i * 9
    const ry = 18 + i * 6
    const rotation = (i * 180) / rings + 90
    return (
      <ellipse
        key={`b${i}`}
        cx="100"
        cy="100"
        rx={rx}
        ry={ry}
        fill="none"
        stroke={stroke}
        strokeWidth="0.4"
        transform={`rotate(${rotation} 100 100)`}
      />
    )
  })

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={{ opacity }}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {paths}
      {paths2}
    </svg>
  )
}

/** Tight engraved double-rule border for document cards — lighter fallback motif. */
export function EngravedFrame({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <div className="absolute inset-[3px] border border-[var(--paper-line)] opacity-60 rounded-[3px]" />
      <div className="absolute inset-[7px] border border-[var(--paper-line)] opacity-35 rounded-[2px]" />
    </div>
  )
}
