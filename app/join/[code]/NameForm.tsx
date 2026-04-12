'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Game = {
  id: string
  game_name: string
  join_code: string
}

export default function NameForm({ game }: { game: Game }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        display_name: name.trim(),
        turn_order: null,
        turn_taken: false,
        is_active: true,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message ?? 'Failed to join. Try again.')
      setLoading(false)
      return
    }

    localStorage.setItem('jamble_player_id', data.id)
    router.push(`/game/${game.join_code}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">What&apos;s your name?</h1>
          <p className="mt-2 text-zinc-400">
            Joining <span className="font-semibold text-white">{game.game_name}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-xl text-white placeholder-zinc-500 focus:border-white focus:outline-none"
            placeholder="Your name"
          />

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? 'Joining…' : "Let's go"}
          </button>
        </form>
      </div>
    </div>
  )
}
