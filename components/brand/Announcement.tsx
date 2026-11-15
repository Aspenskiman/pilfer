import { Logo } from './Logo'

/** The full-screen card that lands when a gift is stolen or locked. */
export function Announcement({ kind, text }: { kind: 'steal' | 'lock'; text: string }) {
  const steal = kind === 'steal'
  return (
    <div
      className="pf-paper mx-4 max-w-lg overflow-hidden text-center"
      style={{
        background: steal ? 'var(--pf-redhanded)' : 'var(--pf-loot)',
        boxShadow: '8px 8px 0 0 var(--pf-tusk)',
      }}
    >
      <div className="pf-stripes h-8 border-b-[3px] border-ink" aria-hidden="true" />
      <div className="px-8 pb-9 pt-6 sm:px-12">
        <Logo size={96} className="mx-auto -rotate-6" />
        <div className="pf-display mt-3 text-6xl text-ink sm:text-7xl">
          {steal ? 'Pilfer!' : 'Locked!'}
        </div>
        <div className="mt-3 text-lg font-bold leading-snug text-ink/85">{text}</div>
      </div>
    </div>
  )
}
