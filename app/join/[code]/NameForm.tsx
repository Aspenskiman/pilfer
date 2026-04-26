'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGame } from '@/app/actions/joinGame'
import { LOCAL_STORAGE_PLAYER_KEY } from '@/constants/game'

const SESSION_TOKEN_KEY = 'pilfer_session_token'

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

    const result = await joinGame({ display_name: name, game_id: game.id })

    if ('error' in result) {
      const msg = typeof result.error === 'string'
        ? result.error
        : (result.error?.display_name?.[0] ?? 'Failed to join. Try again.')
      setError(msg)
      setLoading(false)
      return
    }

    localStorage.setItem(LOCAL_STORAGE_PLAYER_KEY, result.player_id)
    localStorage.setItem(SESSION_TOKEN_KEY, result.session_token)
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
