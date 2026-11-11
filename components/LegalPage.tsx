import Link from 'next/link'
import { LEGAL_LAST_UPDATED } from '@/constants/site'

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1A2B4A] px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-[#B8922A] hover:opacity-80">
          ← Pilfer
        </Link>
        <h1 className="mt-6 text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-white/40">Last updated {LEGAL_LAST_UPDATED}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/75 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </div>
  )
}
