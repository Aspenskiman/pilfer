'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGame } from '@/app/actions/joinGame'
import { track } from '@/lib/analytics'
import { LOCAL_STORAGE_PLAYER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '@/constants/game'
import { CenteredCard } from '@/components/brand/Shell'
import { GiftBox } from '@/components/brand/GiftBox'

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
  const isFull = game.player_limit != null && participantCount >= game.player_limit
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<'participant' | 'spectator'>(isFull ? 'spectator' : 'participant')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const effectiveRole = forceSpectator ? 'spectator' : role

    // The player cap is enforced on the server, inside the join function.
    let result: Awaited<ReturnType<typeof joinGame>>
    try {
      result = await joinGame({ display_name: name, game_id: game.id, role: effectiveRole })
    } catch {
      setError('Network problem. Please try again.')
      setLoading(false)
      return
    }

    if ('error' in result) {
      setError(result.error)
      if (result.full) setRole('spectator')
      setLoading(false)
      return
    }

    track('player_joined', { role: result.role })
    localStorage.setItem(LOCAL_STORAGE_PLAYER_KEY, result.player_id)
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, result.session_token)
    router.push(`/game/${game.join_code}`)
  }

  return (
    <CenteredCard width="max-w-md">
      <h1 className="pf-display pr-20 text-4xl sm:text-5xl">What&apos;s your name?</h1>
      <p className="mt-3 text-ink/70">
        You&apos;re joining <span className="font-extrabold text-ink">{game.game_name}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="display_name" className="pf-label">
            Name everyone will see
          </label>
          <input
            id="display_name"
            type="text"
            required
            autoFocus
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="pf-input !py-3 !text-xl"
            placeholder="Your name"
          />
        </div>

        {/* Role selection */}
        {forceSpectator ? (
          <p className="rounded-xl bg-ink/[0.07] px-4 py-3 text-sm font-semibold text-ink/75">
            This game has already started, so you&apos;ll join as a spectator. You can watch and
            react, no gift needed.
          </p>
        ) : (
          <fieldset>
            <legend className="pf-label">How are you joining?</legend>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={role === 'participant'}
                onClick={() => setRole('participant')}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-2xl border-[3px] border-ink p-4 text-center transition-transform',
                  role === 'participant'
                    ? 'bg-loot shadow-[0_4px_0_0_var(--pf-ink)]'
                    : 'bg-white opacity-70 hover:opacity-100',
                ].join(' ')}
              >
                <GiftBox seed={0} size={56} />
                <span className="font-extrabold">I&apos;m bringing a gift</span>
                <span className="text-xs font-medium leading-tight text-ink/65">
                  Play the game: open, steal and get stolen from
                </span>
              </button>

              <button
                type="button"
                aria-pressed={role === 'spectator'}
                onClick={() => setRole('spectator')}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-2xl border-[3px] border-ink p-4 text-center transition-transform',
                  role === 'spectator'
                    ? 'bg-mint shadow-[0_4px_0_0_var(--pf-ink)]'
                    : 'bg-white opacity-70 hover:opacity-100',
                ].join(' ')}
              >
                <span className="flex h-14 items-center text-4xl" aria-hidden="true">
                  👀
                </span>
                <span className="font-extrabold">I&apos;m just watching</span>
                <span className="text-xs font-medium leading-tight text-ink/65">
                  Cheer and heckle. No gift needed
                </span>
              </button>
            </div>
            {isFull && (
              <p className="mt-3 text-sm font-semibold text-ink/70">
                This game has all its players, but you can still watch.
              </p>
            )}
          </fieldset>
        )}

        {error && (
          <p className="pf-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="pf-btn pf-btn-lg pf-btn-loot w-full">
          {loading ? 'Joining…' : 'Join the game'}
        </button>
      </form>
    </CenteredCard>
  )
}
