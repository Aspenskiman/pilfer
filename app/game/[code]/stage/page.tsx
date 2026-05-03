'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useFeedEvents } from '@/hooks/useFeedEvents'
import { QRCodeSVG } from 'qrcode.react'
import type { FeedEvent } from '@/types'

function getFeedEventStyle(event: FeedEvent): React.CSSProperties {
  if (event.content?.includes('stole'))
    return { backgroundColor: 'rgba(184, 146, 42, 0.5)', border: '1px solid rgba(184, 146, 42, 0.8)' }
  if (event.content?.includes('opened'))
    return { backgroundColor: 'rgba(20, 83, 45, 0.4)', border: '1px solid rgba(34, 197, 94, 0.3)' }
  if (event.content?.includes('locked forever'))
    return { backgroundColor: 'rgba(122, 31, 46, 0.4)', border: '1px solid rgba(122, 31, 46, 0.6)' }
  return { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
}

export default function StagePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  const [gameId, setGameId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stealAnnouncement, setStealAnnouncement] = useState<string | null>(null)
  const [lockAnnouncement, setLockAnnouncement] = useState<string | null>(null)
  const [hostActionMode, setHostActionMode] = useState<'open' | 'steal' | null>(null)
  const feedBottomRef = useRef<HTMLDivElement>(null)

  // Bootstrap: resolve join code → gameId, get current user
  useEffect(() => {
    const supabase = createClient()
    async function bootstrap() {
      const [{ data }, { data: { user } }] = await Promise.all([
        supabase.from('party_games').select('id').eq('join_code', code.toUpperCase()).single(),
        supabase.auth.getUser(),
      ])
      if (data) setGameId(data.id)
      if (user) setUserId(user.id)
    }
    bootstrap()
  }, [code])

  // Auto-dismiss error toast
  useEffect(() => {
    if (!errorMsg) return
    const t = setTimeout(() => setErrorMsg(null), 3000)
    return () => clearTimeout(t)
  }, [errorMsg])

  const game = useGameState(gameId)
  const players = usePlayers(gameId)
  const gifts = useGifts(gameId)
  const feedEvents = useFeedEvents(gameId)

  // Steal / lock announcements
  const lastFeedEvent = feedEvents[feedEvents.length - 1]
  useEffect(() => {
    if (!lastFeedEvent || lastFeedEvent.event_type !== 'narrative') return
    if (lastFeedEvent.content?.includes('stole')) {
      setStealAnnouncement(lastFeedEvent.content)
      setTimeout(() => setStealAnnouncement(null), 4000)
    } else if (lastFeedEvent.content?.includes('locked forever')) {
      setLockAnnouncement(lastFeedEvent.content)
      setTimeout(() => setLockAnnouncement(null), 4000)
    }
  }, [lastFeedEvent?.id])

  // Redirect to recap when host unlocks it
  useEffect(() => {
    if (game?.recap_unlocked) {
      router.push(`/game/${code}/recap`)
    }
  }, [game?.recap_unlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll feed to bottom on new events
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedEvents])

  // Reset host action overlay when the active player changes
  useEffect(() => {
    setHostActionMode(null)
  }, [game?.current_turn_player_id])

  const currentTurnPlayer = players.find((p) => p.id === game?.current_turn_player_id) ?? null
  const onDeckPlayer =
    players
      .filter((p) => (p.turn_order ?? 0) > (currentTurnPlayer?.turn_order ?? 0))
      .sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0))[0] ?? null

  const holderIds = new Set(gifts.map((g) => g.current_holder).filter(Boolean))
  const wrappedGifts = gifts.filter((g) => !g.is_opened)
  const openedGifts = gifts.filter((g) => g.is_opened)
  const hostStealableGifts = gifts.filter(
    (g) => g.is_opened && !g.is_locked && g.current_holder !== game?.current_turn_player_id
  )

  const isHost = !!userId && !!game && userId === game.host_id

  async function openGiftForPlayer(giftId: string) {
    if (!game?.current_turn_player_id) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_open_gift', {
      p_game_id: game.id,
      p_player_id: game.current_turn_player_id,
      p_gift_id: giftId,
    })
    if (error || !data?.success) {
      setErrorMsg(data?.error ?? 'Something went wrong')
    }
  }

  async function stealGiftForPlayer(giftId: string) {
    if (!game?.current_turn_player_id) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_steal_gift', {
      p_game_id: game.id,
      p_actor_id: game.current_turn_player_id,
      p_gift_id: giftId,
    })
    if (error || !data?.success) {
      setErrorMsg(data?.error ?? 'Something went wrong')
    }
  }

  async function endGame() {
    if (!game) return
    const res = await fetch('/api/games/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: game.id }),
    })
    if (res.ok) {
      router.push(`/game/${code}/recap`)
    }
  }

  // Loading state
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A]">
        <p className="text-white/60 text-lg">Loading…</p>
      </div>
    )
  }

  // Game over banner
  if (game.status === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A] px-4">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="text-6xl">🎉</div>
          <h1
            className="text-4xl font-bold text-[#B8922A] tracking-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Game Over!
          </h1>
          <p className="text-white/60 text-lg">{game.game_name}</p>
          {isHost ? (
            <button
              onClick={endGame}
              className="w-full min-h-14 rounded-2xl bg-[#B8922A] text-white font-bold text-xl hover:opacity-90 active:scale-95 transition-all"
            >
              End Game
            </button>
          ) : (
            <p className="text-white/40 text-sm">Waiting for host to end the game…</p>
          )}
        </div>
      </div>
    )
  }

  // Waiting / pre-game state
  if (game.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A]">
        <p className="text-white/60 text-lg">Waiting for host to start the game…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#1A2B4A] text-white overflow-hidden">

      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 inset-x-4 bg-red-600 text-white rounded-xl px-4 py-3 text-sm font-medium z-50 shadow-lg">
          {errorMsg}
        </div>
      )}

      {/* Steal / lock announcement overlay */}
      <AnimatePresence>
        {(stealAnnouncement || lockAnnouncement) && (
          <motion.div
            key={stealAnnouncement ? 'steal' : 'lock'}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {stealAnnouncement ? (
              <div className="bg-[#7A1F2E] rounded-3xl px-12 py-10 text-center shadow-2xl max-w-lg mx-4">
                <div className="text-6xl mb-4">🎁💨</div>
                <div className="text-4xl font-bold text-white mb-3">PILFER!</div>
                <div className="text-white/90 text-lg leading-snug">{stealAnnouncement}</div>
              </div>
            ) : (
              <div className="bg-[#B8922A] rounded-3xl px-12 py-10 text-center shadow-2xl max-w-lg mx-4">
                <div className="text-6xl mb-4">🔒</div>
                <div className="text-4xl font-bold text-white mb-3">LOCKED!</div>
                <div className="text-white/90 text-lg">{lockAnnouncement}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host action overlay */}
      {hostActionMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHostActionMode(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[#1A2B4A] border border-white/15 rounded-xl shadow-2xl p-5">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-[#B8922A] mb-4">
              {hostActionMode === 'open' ? 'Open a gift for ' : 'Steal a gift for '}
              {currentTurnPlayer?.display_name}
            </h3>

            {hostActionMode === 'open' && (
              <div className="flex flex-wrap gap-2">
                {wrappedGifts.length === 0 ? (
                  <p className="text-white/40 text-sm">No wrapped gifts remaining.</p>
                ) : wrappedGifts.map((gift, index) => (
                  <button
                    key={gift.id}
                    onClick={() => { openGiftForPlayer(gift.id); setHostActionMode(null) }}
                    className="flex flex-col items-center justify-center w-24 rounded-xl bg-white/8 border border-white/15 p-3 hover:bg-white/15 active:scale-95 transition-all"
                  >
                    <span className="text-2xl">🎁</span>
                    <span className="text-[11px] text-white/60 mt-1">Gift {index + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {hostActionMode === 'steal' && (
              <div className="space-y-2">
                {hostStealableGifts.length === 0 ? (
                  <p className="text-white/40 text-sm">No stealable gifts available.</p>
                ) : hostStealableGifts.map((gift) => {
                  const holder = players.find((p) => p.id === gift.current_holder)
                  return (
                    <button
                      key={gift.id}
                      onClick={() => { stealGiftForPlayer(gift.id); setHostActionMode(null) }}
                      className="w-full flex items-center gap-3 rounded-xl bg-white/8 border border-white/15 px-3 py-2.5 text-left hover:bg-white/15 active:scale-[0.98] transition-all"
                    >
                      <span className="text-xl">🎁</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{gift.gift_name}</p>
                        {holder && (
                          <p className="text-[11px] text-white/40">Held by {holder.display_name}</p>
                        )}
                      </div>
                      <span className="text-[#B8922A] text-xs font-bold shrink-0 ml-auto">Steal →</span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setHostActionMode(null)}
              className="mt-4 w-full rounded-xl border border-white/15 py-2 text-sm text-white/50 hover:bg-white/8 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                {isHost && isCurrent ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setHostActionMode('open')}
                      className="text-[10px] font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setHostActionMode('steal')}
                      className="text-[10px] font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                      Steal
                    </button>
                  </div>
                ) : (
                  <span className="text-base shrink-0">{hasGift ? '✅' : '⏳'}</span>
                )}
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

          {/* Game title + QR code */}
          {(() => {
            const joinUrl = typeof window !== 'undefined'
              ? `${window.location.origin}/join/${game.join_code}`
              : ''
            return (
              <div className="flex items-center justify-between gap-4">
                <h1
                  className="text-3xl font-bold text-[#B8922A] tracking-tight"
                  style={{ fontFamily: 'var(--font-playfair)' }}
                >
                  {game.game_name}
                </h1>
                {joinUrl && (
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="rounded-lg bg-white p-1">
                      <QRCodeSVG value={joinUrl} size={80} />
                    </div>
                    <p className="text-[10px] text-white/30">Scan to join</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Wrapped gifts */}
          {wrappedGifts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
                Wrapped — {wrappedGifts.length}
              </h3>
              <div className="flex flex-wrap gap-3">
                {wrappedGifts.map((gift, index) => (
                  <div
                    key={gift.id}
                    className="relative w-28 h-28 rounded-xl bg-white/8 border border-white/15 flex flex-col items-center justify-center select-none"
                  >
                    {gift.is_locked && (
                      <span className="absolute top-1.5 right-1.5 text-xs">🔒</span>
                    )}
                    <span className="text-3xl">🎁</span>
                    <span className="text-[11px] text-white/50 mt-1">Gift {index + 1}</span>
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
                        className="w-full max-h-40 object-contain bg-black/20"
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
                className="rounded-lg p-3 space-y-0.5"
                style={getFeedEventStyle(event)}
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
