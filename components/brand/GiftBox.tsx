import Image from 'next/image'

// Six wrapped presents, rendered as glossy 3D objects (public/art/gift-*.webp).
// Each wrapped gift picks one from its position, so a pile of gifts looks like
// a pile of different presents.
const PAPERS = 6

/** A wrapped present. Decorative unless a `title` is given. */
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
  return (
    <Image
      src={`/art/gift-${Math.abs(seed) % PAPERS}.webp`}
      alt={title ?? ''}
      width={size}
      height={size}
      className={`pf-gift ${className}`}
      draggable={false}
    />
  )
}
