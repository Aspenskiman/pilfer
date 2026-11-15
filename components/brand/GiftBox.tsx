import { useId } from 'react'

// Wrapping papers. Each wrapped gift picks one from its position, so a pile of
// gifts looks like a pile of different presents.
const PAPERS = [
  { box: '#ff4f64', lid: '#ff6f80', ribbon: '#f5b841', pattern: 'dots' },
  { box: '#f5b841', lid: '#ffd06b', ribbon: '#ff4f64', pattern: 'none' },
  { box: '#4fe0b5', lid: '#7bedca', ribbon: '#fff7e8', pattern: 'dots' },
  { box: '#fff7e8', lid: '#ffffff', ribbon: '#ff4f64', pattern: 'stripes' },
  { box: '#8b7bff', lid: '#a79bff', ribbon: '#f5b841', pattern: 'none' },
] as const

const INK = '#0c0c17'

/** A wrapped present, drawn in the same ink-outline style as the mascot. */
export function GiftBox({
  seed = 0,
  size = 72,
  className = '',
  title,
}: {
  seed?: number
  size?: number
  className?: string
  title?: string
}) {
  const id = useId()
  const paper = PAPERS[Math.abs(seed) % PAPERS.length]
  const patternId = `${id}-paper`
  const fill = paper.pattern === 'none' ? paper.box : `url(#${patternId})`

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        {paper.pattern === 'dots' && (
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="16" height="16" fill={paper.box} />
            <circle cx="4" cy="4" r="2.2" fill="#ffffff" opacity="0.55" />
            <circle cx="12" cy="12" r="2.2" fill="#ffffff" opacity="0.55" />
          </pattern>
        )}
        {paper.pattern === 'stripes' && (
          <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill={paper.box} />
            <rect width="12" height="6" fill={INK} />
          </pattern>
        )}
      </defs>

      {/* bow */}
      <path
        d="M50 27 C38 6 18 10 24 22 C28 30 42 29 50 27 Z"
        fill={paper.ribbon}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M50 27 C62 6 82 10 76 22 C72 30 58 29 50 27 Z"
        fill={paper.ribbon}
        stroke={INK}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* box */}
      <rect x="15" y="44" width="70" height="48" rx="5" fill={fill} stroke={INK} strokeWidth="4" />
      {/* lid */}
      <rect x="8" y="28" width="84" height="20" rx="5" fill={paper.lid} stroke={INK} strokeWidth="4" />
      {/* ribbon */}
      <rect x="42" y="28" width="16" height="64" fill={paper.ribbon} stroke={INK} strokeWidth="4" />
      {/* knot */}
      <circle cx="50" cy="27" r="7" fill={paper.ribbon} stroke={INK} strokeWidth="4" />
    </svg>
  )
}
