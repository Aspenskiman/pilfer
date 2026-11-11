'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIERS } from '@/constants/tiers'
import type { Tier } from '@/types'

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
      setError('Please enter a game name first.')
      return
    }
    if (!gameDate || Number.isNaN(new Date(gameDate).getTime())) {
      setError('Please set a date and time for your party.')
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
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-white">Set up your game</h1>
          <p className="mt-2 text-zinc-400">
            One price per game. Players never pay, and spectators are always free.
          </p>
        </div>

        <div className="mx-auto mb-8 max-w-sm space-y-3">
          <div className="space-y-1">
            <label htmlFor="game_name" className="block text-sm font-medium text-zinc-300">
              Game name
            </label>
            <input
              id="game_name"
              type="text"
              required
              maxLength={60}
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="e.g. Office Holiday Party"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="game_date" className="block text-sm font-medium text-zinc-300">
              Party date &amp; time
            </label>
            <input
              id="game_date"
              type="datetime-local"
              required
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-white focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="mx-auto mb-6 flex max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-1">
          {(['personal', 'team'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                group === g ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {g === 'personal' ? 'Friends & family' : 'Work & organizations'}
            </button>
          ))}
        </div>

        <div className={`mx-auto grid gap-4 ${tiers.length === 3 ? 'sm:grid-cols-3' : 'max-w-2xl sm:grid-cols-2'}`}>
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-xl border p-6 ${
                tier.highlight ? 'border-white bg-zinc-800' : 'border-zinc-700 bg-zinc-900'
              }`}
            >
              {tier.highlight && (
                <span className="mb-3 self-start rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-950">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-white">{tier.label}</h2>
              <p className="mt-1 text-sm text-zinc-400">{tier.players}</p>
              <p className="mt-4 text-3xl font-bold text-white">
                {tier.price}
                {tier.priceInCents != null && (
                  <span className="ml-1 text-sm font-normal text-zinc-400">per game</span>
                )}
              </p>

              <button
                onClick={() => handleSelect(tier)}
                disabled={loading !== null}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  tier.highlight
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                    : 'border border-zinc-600 text-white hover:bg-zinc-800'
                }`}
              >
                {loading === tier.id
                  ? tier.priceInCents == null ? 'Creating…' : 'Redirecting to checkout…'
                  : tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {group === 'personal'
            ? 'For non-commercial games with friends and family.'
            : 'For companies, teams, churches, schools and other organizations. Includes a receipt for expensing.'}
        </p>

        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
