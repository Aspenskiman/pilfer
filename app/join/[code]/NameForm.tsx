'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { joinGame } from '@/app/actions/joinGame'
import { LOCAL_STORAGE_PLAYER_KEY } from '@/constants/game'

const SESSION_TOKEN_KEY = 'pilfer_session_token'

type Game = {
  id: string
  game_name: string
  join_code: string
  player_limit: number | null
}

type Props = {
  game: Game
  participantCount: number
  forceSpectator?: boolean
}

export default function NameForm({ game, participantCount, forceSpectator = false }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<'participant' | 'spectator'>('participant')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const effectiveRole = forceSpectator ? 'spectator' : role

    // Check participant capacity at submit time for freshest count
    if (effectiveRole === 'participant' && game.player_limit != null) {
      const supabase = createClient()
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', game.id)
        .eq('role', 'participant')

      if (count != null && count >= game.player_limit) {
        setError("This game is full for gift givers — you can still join as a spectator")
        setRole('spectator')
        setLoading(false)
        return
      }
    }

    const result = await joinGame({ display_name: name, game_id: game.id, role: effectiveRole })

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

        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Role selection */}
          {forceSpectator ? (
            <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center">
              <p className="text-sm text-zinc-400">
                👁 Game is in progress — joining as <span className="text-white font-semibold">spectator only</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('participant')}
                className={[
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                  role === 'participant'
                    ? 'border-[#B8922A] bg-[#B8922A]/10'
                    : 'border-white/15 bg-white/5 hover:border-white/30',
                ].join(' ')}
              >
                <span className="text-4xl">🎁</span>
                <span className="font-bold text-white text-sm">I&apos;m gifting</span>
                <span className="text-xs text-zinc-500 leading-tight">
                  Join the game and bring a gift
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('spectator')}
                className={[
                  'flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                  role === 'spectator'
                    ? 'border-white/40 bg-white/10'
                    : 'border-white/15 bg-white/5 hover:border-white/30',
                ].join(' ')}
              >
                <span className="text-4xl">👁</span>
                <span className="font-bold text-white text-sm">I&apos;m watching</span>
                <span className="text-xs text-zinc-500 leading-tight">
                  Cheer everyone on — no gift needed
                </span>
              </button>
            </div>
          )}

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
