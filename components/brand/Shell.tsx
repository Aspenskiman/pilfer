import { Logo, Wordmark } from './Logo'

/** Night-sky page background used by every screen. */
export function PageShell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`pf-page ${className}`}>{children}</div>
}

/** Slim top bar: wordmark on the left, anything on the right. */
export function TopBar({
  children,
  href = '/',
  maxWidth = 'max-w-5xl',
}: {
  children?: React.ReactNode
  href?: string
  maxWidth?: string
}) {
  return (
    <header className={`mx-auto flex w-full ${maxWidth} items-center justify-between gap-4 px-5 py-5 sm:px-6`}>
      <Wordmark href={href} />
      {children && <div className="flex items-center gap-2 sm:gap-3">{children}</div>}
    </header>
  )
}

/**
 * Ivory paper card with the burglar-stripe band along the top and the mascot
 * peeking over the edge. Every form in the app lives on one of these.
 */
export function PaperCard({
  children,
  mascot = true,
  tone = 'loot',
  className = '',
}: {
  children: React.ReactNode
  mascot?: boolean
  tone?: 'loot' | 'red'
  className?: string
}) {
  return (
    <div className={`relative ${mascot ? 'mt-12' : ''} ${className}`}>
      {mascot && (
        <div className="absolute -top-10 right-6 z-10 -rotate-6">
          <Logo size={88} />
        </div>
      )}
      <div className={`pf-paper overflow-hidden ${tone === 'red' ? 'pf-paper-red' : ''}`}>
        <div className="pf-stripes h-8 border-b-[3px] border-ink" aria-hidden="true" />
        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

/** Centered single-card layout for sign-in, join and short forms. */
export function CenteredCard({
  children,
  width = 'max-w-md',
  tone,
  topBarHref = '/',
}: {
  children: React.ReactNode
  width?: string
  tone?: 'loot' | 'red'
  topBarHref?: string
}) {
  return (
    <PageShell className="flex flex-col">
      <TopBar href={topBarHref} />
      <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-4">
        <div className={`w-full ${width}`}>
          <PaperCard tone={tone}>{children}</PaperCard>
        </div>
      </main>
    </PageShell>
  )
}

/** Full-screen notice: not found, loading, game ended and so on. */
export function StatusScreen({
  title,
  children,
  action,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <PageShell className="flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm text-center">
        <Logo size={112} className="mx-auto" />
        <h1 className="pf-display mt-6 text-4xl text-tusk">{title}</h1>
        {children && <div className="mt-3 text-lg text-tusk/70">{children}</div>}
        {action && <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>}
      </div>
    </PageShell>
  )
}
