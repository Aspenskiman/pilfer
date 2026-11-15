import Image from 'next/image'
import Link from 'next/link'

/** The Pilfer mascot tile. Decorative by default; pass `alt` where it is the only label. */
export function Logo({
  size = 48,
  alt = '',
  className = '',
  priority = false,
}: {
  size?: number
  alt?: string
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/pilfer-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size }}
    />
  )
}

/** Logo plus the "Pilfer" wordmark, linking home (or wherever `href` points). */
export function Wordmark({
  href = '/',
  size = 44,
  showByline = true,
}: {
  href?: string
  size?: number
  showByline?: boolean
}) {
  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <Logo size={size} priority className="pf-wiggle" />
      <span className="flex items-baseline gap-2">
        <span className="pf-display text-[1.75rem] text-tusk">Pilfer</span>
        {showByline && <span className="hidden whitespace-nowrap text-sm font-medium text-tusk/50 sm:inline">by Jamble</span>}
      </span>
    </Link>
  )
}
