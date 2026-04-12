'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIERS = [
  {
    id: 'free',
    label: 'The Taster',
    players: 'Up to 8 players',
    price: 'Free',
    cta: 'Start for free',
    highlight: false,
  },
  {
    id: 'tier1',
    label: 'The Gathering',
    players: 'Up to 15 players',
    price: '$29.99',
    cta: 'Choose this plan',
    highlight: false,
  },
  {
    id: 'tier2',
    label: 'The Party',
    players: 'Up to 30 players',
    price: '$49.99',
    cta: 'Choose this plan',
    highlight: true,
  },
  {
    id: 'tier3',
    label: 'The Bash',
    players: 'Up to 50 players',
    price: '$79.99',
    cta: 'Choose this plan',
    highlight: false,
  },
]

export default function PricingTiers() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(tierId: string) {
    if (tierId === 'free') {
      router.push('/dashboard')
      return
    }

    setLoading(tierId)
    setError(null)

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: tierId }),
    })

    const data = await res.json()
    setLoading(null)

    if (!res.ok || !data.url) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      return
    }

    window.location.href = data.url
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-white">Choose your plan</h1>
          <p className="mt-2 text-zinc-400">Pick the size that fits your game night.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-xl border p-6 ${
                tier.highlight
                  ? 'border-white bg-zinc-800'
                  : 'border-zinc-700 bg-zinc-900'
              }`}
            >
              {tier.highlight && (
                <span className="mb-3 self-start rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-950">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-white">{tier.label}</h2>
              <p className="mt-1 text-sm text-zinc-400">{tier.players}</p>
              <p className="mt-4 text-3xl font-bold text-white">{tier.price}</p>

              <button
                onClick={() => handleSelect(tier.id)}
                disabled={loading === tier.id}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  tier.highlight
                    ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                    : 'border border-zinc-600 text-white hover:bg-zinc-800'
                }`}
              >
                {loading === tier.id ? 'Redirecting…' : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-6 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
