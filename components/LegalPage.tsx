import { LEGAL_LAST_UPDATED } from '@/constants/site'
import { PageShell, TopBar } from '@/components/brand/Shell'

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageShell>
      <TopBar maxWidth="max-w-3xl" />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-4 sm:px-6">
        <div className="pf-paper pf-paper-flat px-6 py-8 sm:px-10 sm:py-10">
          <h1 className="pf-display text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm font-medium text-ink/55">Last updated {LEGAL_LAST_UPDATED}</p>
          <div className="mt-8 space-y-6 leading-relaxed text-ink/80 [&_a]:font-bold [&_a]:underline [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
            {children}
          </div>
        </div>
      </main>
    </PageShell>
  )
}
