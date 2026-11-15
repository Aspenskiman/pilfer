'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import { track } from '@/lib/analytics'
import { StatusScreen } from '@/components/brand/Shell'
import WaitingRoom from './WaitingRoom'

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
  const [startError, setStartError] = useState<string | null>(null)

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
  const { currentPlayerId } = useCurrentPlayer(players)

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
  const gifters = players.filter((p) => p.role === 'participant')
  const allSubmitted = gifters.length > 0 && gifters.every((p) => submittedIds.has(p.id))

  async function handleStartGame() {
    if (!game || startingGame) return
    setStartError(null)

    const withGift = players.filter((p) => submittedIds.has(p.id))
    const withoutGift = players.filter((p) => p.role === 'participant' && !submittedIds.has(p.id))

    if (withGift.length < 2) {
      setStartError('You need at least 2 players who have submitted a gift.')
      return
    }

    if (withoutGift.length > 0) {
      const confirmed = window.confirm(
        `Ready to go live?\n\n` +
        `✅ ${withGift.length} players — gifted up\n` +
        `⚠️ ${withoutGift.length} will watch as spectators (no gift submitted):\n` +
        `${withoutGift.map((p) => p.display_name).join(', ')}\n\n` +
        `Go live anyway?`
      )
      if (!confirmed) return
    }

    setStartingGame(true)
    // Turn order, spectators and going live all happen in one database
    // transaction, so the game can never end up half-started.
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_start_game', { p_game_id: game.id })
    setStartingGame(false)

    if (error || !data?.success) {
      setStartError(data?.error ?? 'Could not start the game. Please try again.')
    } else {
      track('game_started', { players: withGift.length })
    }
  }

  if (notFound) {
    return (
      <StatusScreen title="Game not found">
        <p>This game doesn&apos;t exist or has ended.</p>
      </StatusScreen>
    )
  }

  if (!game) {
    return <StatusScreen title="Loading…" />
  }

  // Lobby — waiting room
  return (
    <WaitingRoom
      gameName={game.game_name}
      joinCode={game.join_code}
      players={players}
      submittedIds={submittedIds}
      giftCount={gifts.length}
      currentPlayerId={currentPlayerId}
      isHost={isHost}
      alreadySubmitted={alreadySubmitted}
      allSubmitted={allSubmitted}
      startingGame={startingGame}
      startError={startError}
      onStart={handleStartGame}
    />
  )
}
