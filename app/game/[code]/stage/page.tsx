'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useFeedEvents } from '@/hooks/useFeedEvents'

export default function StagePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  const [gameId, setGameId] = useState<string | null>(null)
  const feedBottomRef = useRef<HTMLDivElement>(null)

  // Bootstrap: resolve join code → gameId
  useEffect(() => {
    const supabase = createClient()
    async function bootstrap() {
      const { data } = await supabase
        .from('party_games')
        .select('id')
        .eq('join_code', code.toUpperCase())
        .single()
      if (data) setGameId(data.id)
    }
    bootstrap()
  }, [code])

  const game = useGameState(gameId)
  const players = usePlayers(gameId)
  const gifts = useGifts(gameId)
  const feedEvents = useFeedEvents(gameId)

  // Redirect to recap when game ends
  useEffect(() => {
    if (game?.status === 'complete') {
      router.push(`/game/${code}/recap`)
    }
  }, [game?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll feed to bottom on new events
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedEvents])

  const currentTurnPlayer = players.find((p) => p.id === game?.current_turn_player_id) ?? null
  const onDeckPlayer =
    players
      .filter((p) => (p.turn_order ?? 0) > (currentTurnPlayer?.turn_order ?? 0))
      .sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0))[0] ?? null

  const holderIds = new Set(gifts.map((g) => g.current_holder).filter(Boolean))
  const wrappedGifts = gifts.filter((g) => !g.is_opened)
  const openedGifts = gifts.filter((g) => g.is_opened)

  // Waiting / loading states
  if (!game || game.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A]">
        <p className="text-white/60 text-lg">Waiting for host to start the game…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#1A2B4A] text-white overflow-hidden">

      {/* ── LEFT COLUMN — Players ──────────────────────────────── */}
      <div className="w-1/5 border-r border-white/10 flex flex-col min-w-0">
        <h2 className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#B8922A] shrink-0">
          Players
        </h2>
        <ul className="flex-1 overflow-y-auto divide-y divide-white/5">
          {[...players]
            .sort((a, b) => {
              if (a.turn_order == null && b.turn_order == null) return 0
              if (a.turn_order == null) return 1
              if (b.turn_order == null) return -1
              return a.turn_order - b.turn_order
            })
            .map((player) => {
            const isCurrent = player.id === game.current_turn_player_id
            const hasGift = holderIds.has(player.id)
            return (
              <li
                key={player.id}
                className={[
                  'px-4 py-3 flex items-center justify-between gap-2 transition-colors',
                  isCurrent
                    ? 'bg-[#B8922A]/20 border-l-2 border-[#B8922A]'
                    : 'border-l-2 border-transparent',
                ].join(' ')}
              >
                <span className="text-sm font-medium truncate">
                  {player.role === 'spectator' && <span className="mr-1">👁</span>}
                  {player.display_name}
                  {isCurrent && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase text-[#B8922A]">
                      ← now
                    </span>
                  )}
                </span>
                <span className="text-base shrink-0">{hasGift ? '✅' : '⏳'}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── CENTER COLUMN — Game ───────────────────────────────── */}
      <div className="w-3/5 flex flex-col overflow-hidden border-r border-white/10">

        {/* Turn bar */}
        <div className="px-6 py-3 border-b border-white/10 flex items-center gap-4 text-sm shrink-0">
          <span>
            <span className="text-[#B8922A] font-semibold">Current turn: </span>
            <span className="text-white font-medium">
              {currentTurnPlayer?.display_name ?? '—'}
            </span>
          </span>
          <span className="text-white/20">|</span>
          <span>
            <span className="text-white/50">On deck: </span>
            <span className="text-white/80">
              {onDeckPlayer?.display_name ?? '—'}
            </span>
          </span>
        </div>

        {/* Gift area — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* Game title */}
          <h1
            className="text-3xl font-bold text-center text-[#B8922A] tracking-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {game.game_name}
          </h1>

          {/* Wrapped gifts */}
          {wrappedGifts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                Wrapped — {wrappedGifts.length}
              </h3>
              <div className="flex flex-wrap gap-3">
                {wrappedGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="relative w-28 h-28 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center select-none"
                  >
                    {gift.is_locked && (
                      <span className="absolute top-1.5 right-1.5 text-xs">🔒</span>
                    )}
                    <span className="text-3xl">🎁</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Opened gifts */}
          {openedGifts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                Opened — {openedGifts.length}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {openedGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="relative rounded-xl bg-white/8 border border-white/15 overflow-hidden"
                  >
                    {gift.is_locked && (
                      <span className="absolute top-1.5 right-1.5 text-sm z-10">🔒</span>
                    )}
                    {gift.image_url ? (
                      <img
                        src={gift.image_url}
                        alt={gift.gift_name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-white/5 flex items-center justify-center px-2">
                        <p className="text-xs text-white/40 text-center leading-tight line-clamp-3">
                          {gift.gift_name}
                        </p>
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="text-xs font-semibold truncate">{gift.gift_name}</p>
                      {gift.steal_count > 0 && (
                        <p className="text-[11px] text-[#B8922A] mt-0.5">
                          🔄 {gift.steal_count} steal{gift.steal_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {gifts.length === 0 && (
            <p className="text-center text-white/20 text-sm pt-12">
              No gifts yet.
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN — Live Feed ───────────────────────────── */}
      <div className="w-1/5 flex flex-col min-w-0">
        <h2 className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#B8922A] shrink-0">
          Live Feed
        </h2>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {feedEvents.length === 0 && (
            <p className="text-center text-white/20 text-xs pt-4">Feed is quiet…</p>
          )}
          {feedEvents.map((event) => {
            const player = players.find((p) => p.id === event.player_id)
            return (
              <div
                key={event.id}
                className="rounded-lg bg-white/5 px-3 py-2 border border-white/5"
              >
                {player && (
                  <p className="text-[11px] font-semibold text-[#B8922A] mb-0.5 truncate">
                    {player.role === 'spectator' && <span className="mr-1">👁</span>}
                    {player.display_name}
                  </p>
                )}
                <p className="text-xs text-white/75 leading-snug">{event.content}</p>
              </div>
            )
          })}
          <div ref={feedBottomRef} />
        </div>
      </div>

    </div>
  )
}
