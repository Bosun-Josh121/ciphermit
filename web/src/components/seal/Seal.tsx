interface Props {
  size?: number
  className?: string
}

const MICROTEXT = 'CIPHERMIT • AUTHORIZED • CIPHERMIT • AUTHORIZED • '

/**
 * Rosette medallion with a microtext ring. Used as the authorization stamp
 * and as a small brand mark in the wordmark lockup.
 */
export function Seal({ size = 96, className = '' }: Props) {
  const petals = 16
  const cx = 50
  const cy = 50
  const outerR = 44
  const innerR = 30
  const petalPoints = Array.from({ length: petals * 2 }, (_, i) => {
    const angle = (i / (petals * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? outerR : innerR
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <path id="seal-text-path" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={47} fill="none" stroke="var(--seal-deep)" strokeWidth="0.6" opacity="0.7" />
      <circle cx={cx} cy={cy} r={38} fill="none" stroke="var(--seal)" strokeWidth="0.5" opacity="0.55" />

      {/* Microtext ring */}
      <text fontSize="3.1" fill="var(--seal)" opacity="0.85" letterSpacing="0.5">
        <textPath href="#seal-text-path" startOffset="0%">
          {MICROTEXT}
        </textPath>
      </text>

      {/* Rosette */}
      <polygon points={petalPoints} fill="var(--seal)" opacity="0.92" />
      <polygon points={petalPoints} fill="none" stroke="var(--seal-deep)" strokeWidth="0.8" />

      {/* Center disc + mark */}
      <circle cx={cx} cy={cy} r={20} fill="var(--seal-deep)" />
      <circle cx={cx} cy={cy} r={18} fill="var(--seal)" />
      <text
        x={cx}
        y={cy + 3}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="var(--ink)"
        fontFamily="var(--font-display)"
      >
        c
      </text>
    </svg>
  )
}
