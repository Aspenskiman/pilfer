const COLORS = ['#f5b841', '#ff4f64', '#4fe0b5', '#8b7bff', '#fff7e8', '#ff9a5a']

function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Round initial badge for a player. Colour is stable for a given name. */
export function Avatar({
  name,
  size = 40,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const trimmed = name.trim()
  const initial = trimmed ? Array.from(trimmed)[0].toUpperCase() : '?'
  return (
    <span
      aria-hidden="true"
      className={`pf-display inline-flex shrink-0 items-center justify-center rounded-full border-[2.5px] border-ink text-ink ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.48,
        background: COLORS[hash(trimmed) % COLORS.length],
      }}
    >
      {initial}
    </span>
  )
}
