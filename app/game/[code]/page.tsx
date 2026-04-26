'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'

export default function GamePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  const [gameId, setGameId] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [startingGame, setStartingGame] = useState(false)

  // Bootstrap: resolve join code → gameId, get auth user
  useEffect(() => {
    setAlreadySubmitted(
      new URLSearchParams(window.location.search).get('already_submitted') === '1'
    )

    const supabase = createClient()

    async function bootstrap() {
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)

      const { data } = await supabase
        .from('party_games')
        .select('id')
        .eq('join_code', code.toUpperCase())
        .single()

      if (!data) { setNotFound(true); return }
      setGameId(data.id)
    }

    bootstrap()
  }, [code])

  // Reactive hooks — all subscriptions managed internally
  const game = useGameState(gameId)
  const players = usePlayers(gameId)
  const gifts = useGifts(gameId)
  const { currentPlayer, currentPlayerId } = useCurrentPlayer(players)

  // Auto-redirect on status change
  useEffect(() => {
    if (!game) return
    if (game.status === 'active') {
      const isMobile = window.innerWidth < 768
      router.push(`/game/${code}/${isMobile ? 'play' : 'stage'}`)
    }
    if (game.status === 'complete') {
      router.push(`/game/${code}/recap`)
    }
  }, [game?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const submittedIds = new Set(gifts.map((g) => g.submitted_by))
  const isHost = authUser?.id === game?.host_id
  const allSubmitted = players.length > 0 && players.every((p) => submittedIds.has(p.id))

  async function handleStartGame() {
    if (!game || players.length === 0) return
    setStartingGame(true)

    const supabase = createClient()

    // Pre-flight: split players into participants (submitted a gift) and auto-spectators
    // TODO: submittedIds is also computed at component level (line ~69) —
    // consolidate into one when refactoring
    const submittedByIds = new Set(gifts.map((g) => g.submitted_by))
    const participants = players.filter((p) => submittedByIds.has(p.id))
    const autoSpectators = players.filter((p) => !submittedByIds.has(p.id))

    if (autoSpectators.length > 0) {
      const confirmed = window.confirm(
        `Ready to go live?\n\n` +
        `✅ ${participants.length} participants — gifted up\n` +
        `⚠️ ${autoSpectators.length} spectators (no gift submitted):\n` +
        `${autoSpectators.map((p) => p.display_name).join(', ')}\n\n` +
        `Go live anyway?`
      )
      if (!confirmed) {
        setStartingGame(false)
        return
      }
    }

    // Mark non-submitters as spectators
    if (autoSpectators.length > 0) {
      await Promise.all(
        autoSpectators.map((p) =>
          supabase.from('players').update({ role: 'spectator' }).eq('id', p.id)
        )
      )
    }

    // Shuffle participants only and assign 1-indexed turn order
    const shuffled = [...participants].sort(() => Math.random() - 0.5)
    await Promise.all(
      shuffled.map((player, i) =>
        supabase.from('players').update({ turn_order: i + 1 }).eq('id', player.id)
      )
    )

    // Go live — set first turn and round number
    await supabase.from('party_games').update({
      status: 'active',
      current_turn_player_id: shuffled[0].id,
      round_number: 1,
    }).eq('id', game.id)

    setStartingGame(false)
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game not found</h1>
          <p className="text-zinc-400">This game doesn&apos;t exist or has ended.</p>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500">Loading…</p>
      </div>
    )
  }

  // Lobby — waiting room
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-md space-y-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            {isHost ? 'Host view — ' : ''}Waiting room
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{game.game_name}</h1>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-zinc-400">
            {game.join_code}
          </p>
        </div>

        {alreadySubmitted && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-sm text-zinc-300">
            You&apos;ve already submitted your gift.
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="mb-4 text-sm font-medium text-zinc-400">
            {players.length} {players.length === 1 ? 'player' : 'players'} joined
          </p>

          <ul className="space-y-2">
            {players.map((player) => {
              const isMe = player.id === currentPlayerId
              const hasSubmitted = submittedIds.has(player.id)

              return (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{player.display_name}</span>
                    {isMe && <span className="text-xs text-zinc-500">(you)</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {isMe && !hasSubmitted && (
                      <Link
                        href={`/game/${game.join_code}/submit`}
                        className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
                      >
                        Submit Gift
                      </Link>
                    )}
                    <span
                      className={`text-lg ${hasSubmitted ? 'text-green-500' : ''}`}
                      title={hasSubmitted ? 'Submitted' : 'Pending'}
                    >
                      {hasSubmitted ? '✓' : '⏳'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>

          {players.length === 0 && (
            <p className="text-center text-sm text-zinc-600">
              No players yet — share the join code!
            </p>
          )}
        </div>

        {/* Host-only: Start Game */}
        {isHost && (
          <div className="space-y-2">
            <button
              onClick={handleStartGame}
              disabled={startingGame || players.length === 0}
              className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
            >
              {startingGame ? 'Starting…' : 'Start Game'}
            </button>
            {!allSubmitted && players.length > 0 && (
              <p className="text-center text-xs text-zinc-500">
                Not everyone has submitted yet — you can still start.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
