'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIERS } from '@/constants/tiers'
import type { Tier } from '@/types'
import { track } from '@/lib/analytics'
import Link from 'next/link'
import { PageShell, TopBar } from '@/components/brand/Shell'

const PERSONAL = TIERS.filter((t) => t.group === 'personal')
const TEAM = TIERS.filter((t) => t.group === 'team')

export default function PricingTiers() {
  const router = useRouter()
  const [group, setGroup] = useState<'personal' | 'team'>('personal')
  const [gameName, setGameName] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(tier: Tier) {
    if (loading) return

    if (!gameName.trim()) {
      setError('Give your game a name first.')
      return
    }
    if (!gameDate || Number.isNaN(new Date(gameDate).getTime())) {
      setError('Set a date and time for your party first.')
      return
    }

    setLoading(tier.id)
    setError(null)

    const isFree = tier.priceInCents == null
    try {
      const res = await fetch(isFree ? '/api/games/create' : '/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier.id,
          game_name: gameName.trim(),
          game_date: new Date(gameDate).toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        setLoading(null)
        return
      }

      track(isFree ? 'game_created' : 'checkout_started', { plan: tier.id })
      if (isFree) {
        router.push(`/dashboard/${data.game_id}`)
      } else if (data.url) {
        window.location.href = data.url // keep the button disabled while redirecting
      } else {
        setError('Something went wrong. Please try again.')
        setLoading(null)
      }
    } catch {
      setError('Network problem. Please check your connection and try again.')
      setLoading(null)
    }
  }

  const tiers = group === 'personal' ? PERSONAL : TEAM

  return (
    <PageShell>
      <TopBar href="/dashboard" maxWidth="max-w-4xl">
        <Link href="/dashboard" className="text-sm font-bold text-tusk/75 hover:text-tusk">
          Your games
        </Link>
      </TopBar>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-6 sm:px-6">
        <h1 className="pf-display text-5xl text-tusk sm:text-6xl">Set up a game</h1>
        <p className="mt-3 max-w-xl text-lg text-tusk/70">
          One price per game. Players never pay, and spectators are always free.
        </p>

        {/* Step 1: the party */}
        <section className="mt-10">
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-tusk">
            <span className="pf-display flex h-9 w-9 items-center justify-center rounded-full bg-loot text-xl text-ink">
              1
            </span>
            Name your party
          </h2>
          <div className="pf-paper mt-4 grid gap-5 p-6 sm:grid-cols-2">
            <div>
              <label htmlFor="game_name" className="pf-label">
                Game name
              </label>
              <input
                id="game_name"
                type="text"
                required
                maxLength={60}
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="pf-input"
                placeholder="Office holiday party"
              />
            </div>
            <div>
              <label htmlFor="game_date" className="pf-label">
                Party date and time
              </label>
              <input
                id="game_date"
                type="datetime-local"
                required
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="pf-input"
              />
            </div>
          </div>
        </section>

        {/* Step 2: the plan */}
        <section className="mt-12">
          <h2 className="flex items-center gap-3 text-xl font-extrabold text-tusk">
            <span className="pf-display flex h-9 w-9 items-center justify-center rounded-full bg-loot text-xl text-ink">
              2
            </span>
            Pick a size
          </h2>

          <div
            role="tablist"
            aria-label="Who the game is for"
            className="mt-4 inline-flex rounded-2xl border-2 border-tusk/20 bg-alley p-1"
          >
            {(['personal', 'team'] as const).map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                onClick={() => setGroup(g)}
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition-colors ${
                  group === g ? 'bg-tusk text-ink' : 'text-tusk/65 hover:text-tusk'
                }`}
              >
                {g === 'personal' ? 'Friends and family' : 'Work and organizations'}
              </button>
            ))}
          </div>
          <p className="mt-3 text-tusk/65">
            {group === 'personal'
              ? 'For non-commercial games with friends and family.'
              : 'For companies, teams, churches, schools and other organizations. Includes a receipt for expensing.'}
          </p>

          {error && (
            <p className="pf-error-dark mt-4" role="alert">
              {error}
            </p>
          )}

          <div className={`mt-6 grid gap-6 ${tiers.length === 3 ? 'md:grid-cols-3' : 'max-w-2xl md:grid-cols-2'}`}>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`pf-paper flex flex-col p-6 ${tier.highlight ? '' : 'pf-paper-flat'} ${
                  group === 'team' && tier.highlight ? 'pf-paper-red' : ''
                }`}
              >
                <div className="mb-2 min-h-7">
                  {tier.highlight && <span className="pf-chip pf-chip-open">Most popular</span>}
                </div>
                <h3 className="text-xl font-extrabold leading-tight">{tier.label}</h3>
                <p className="mt-1 font-semibold text-ink/65">{tier.players}</p>
                <p className="mb-6 mt-5 flex items-baseline gap-2">
                  <span className="pf-display text-6xl">{tier.price}</span>
                  {tier.priceInCents != null && (
                    <span className="text-sm font-bold text-ink/60">per game</span>
                  )}
                </p>

                <button
                  onClick={() => handleSelect(tier)}
                  disabled={loading !== null}
                  className={`pf-btn mt-auto w-full ${tier.highlight ? 'pf-btn-loot' : 'pf-btn-tusk'}`}
                >
                  {loading === tier.id
                    ? tier.priceInCents == null ? 'Creating…' : 'Taking you to checkout…'
                    : tier.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  )
}
