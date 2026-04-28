'use client'

import { use, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useFeedEvents } from '@/hooks/useFeedEvents'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import type { FeedEvent } from '@/types'

function getFeedEventStyle(event: FeedEvent): React.CSSProperties {
  if (event.content?.includes('stole'))
    return { backgroundColor: 'rgba(184, 146, 42, 0.5)', border: '1px solid rgba(184, 146, 42, 0.8)' }
  if (event.content?.includes('opened'))
    return { backgroundColor: 'rgba(20, 83, 45, 0.4)', border: '1px solid rgba(34, 197, 94, 0.3)' }
  if (event.content?.includes('locked forever'))
    return { backgroundColor: 'rgba(122, 31, 46, 0.4)', border: '1px solid rgba(122, 31, 46, 0.6)' }
  return { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.05)' }
}

const EMOJIS = ['🎁', '😱', '😂', '🔥', '👀', '💀'] as const
const TAUNTS = ["Bold move...", "You won't steal mine 😤", "Classic."] as const

export default function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)

  const [gameId, setGameId] = useState<string | null>(null)
  const [openPickerVisible, setOpenPickerVisible] = useState(false)
  const [stealSheetOpen, setStealSheetOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stealAnnouncement, setStealAnnouncement] = useState<string | null>(null)
  const [lockAnnouncement, setLockAnnouncement] = useState<string | null>(null)
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
  const { currentPlayer } = useCurrentPlayer(players)

  // Auto-scroll feed to bottom on new events
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedEvents])

  // Auto-dismiss error toast after 3 seconds
  useEffect(() => {
    if (!errorMsg) return
    const t = setTimeout(() => setErrorMsg(null), 3000)
    return () => clearTimeout(t)
  }, [errorMsg])

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

  const currentTurnPlayer = players.find((p) => p.id === game?.current_turn_player_id) ?? null
  const isMyTurn = !!currentPlayer && currentPlayer.id === currentTurnPlayer?.id
  const isSpectator = currentPlayer?.role === 'spectator'
  const myGift = gifts.find((g) => g.current_holder === currentPlayer?.id) ?? null

  // Derived gift lists — computed once, used in both render branches
  const wrappedGifts = gifts.filter((g) => !g.is_opened)
  const stealableGifts = gifts.filter(
    (g) => g.is_opened && !g.is_locked && g.current_holder !== currentPlayer?.id
  )

  // Direct client mutation — emoji/taunt reactions don't go through a hook
  async function sendFeedEvent(content: string, eventType: 'reaction' | 'taunt') {
    if (!gameId || !currentPlayer) return
    const supabase = createClient()
    await supabase.from('feed_events').insert({
      game_id: gameId,
      player_id: currentPlayer.id,
      event_type: eventType,
      content,
    })
  }

  async function openGift(giftId: string) {
    if (!currentPlayer || !game) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_open_gift', {
      p_game_id: game.id,
      p_player_id: currentPlayer.id,
      p_gift_id: giftId,
    })
    if (error || !data?.success) {
      setErrorMsg(data?.error ?? 'Something went wrong')
    }
  }

  async function stealGift(giftId: string) {
    if (!currentPlayer || !game) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_steal_gift', {
      p_game_id: game.id,
      p_actor_id: currentPlayer.id,
      p_gift_id: giftId,
    })
    if (error || !data?.success) {
      setErrorMsg(data?.error ?? 'Something went wrong')
    } else {
      setStealSheetOpen(false)
    }
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A]">
        <p className="text-white/60">Loading…</p>
      </div>
    )
  }

  // ── MY TURN full-screen takeover ──────────────────────────────
  if (isMyTurn && !isSpectator && game.status === 'active') {
    return (
      <div className="min-h-screen bg-[#B8922A] flex flex-col items-center justify-center px-6 gap-8">

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

        <p className="text-6xl font-black text-white tracking-tight text-center leading-none">
          YOUR<br />TURN
        </p>

        <div className="flex flex-col w-full max-w-xs gap-4">

          {/* OPEN A GIFT */}
          {currentPlayer.role !== 'spectator' && (
            <>
              <button
                disabled={!isMyTurn}
                onClick={() => setOpenPickerVisible((v) => !v)}
                className="min-h-16 w-full rounded-2xl bg-white text-[#1A2B4A] font-bold text-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                {openPickerVisible ? 'CANCEL' : 'OPEN A GIFT'}
              </button>

              {openPickerVisible && (
                <div className="w-full rounded-xl bg-white/20 p-3">
                  {wrappedGifts.length === 0 ? (
                    <p className="text-center text-white/70 text-sm py-2">
                      No gifts left to open
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {wrappedGifts.map((gift) => (
                        <button
                          key={gift.id}
                          onClick={() => { openGift(gift.id); setOpenPickerVisible(false) }}
                          className="flex flex-col items-center justify-center rounded-xl bg-white/90 p-4 active:scale-95 transition-transform"
                        >
                          <span className="text-4xl">🎁</span>
                          <p className="mt-1.5 text-xs text-[#1A2B4A]/50 font-medium">
                            Mystery Gift
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEAL A GIFT */}
          {currentPlayer.role !== 'spectator' && (
            stealableGifts.length > 0 ? (
              <button
                onClick={() => setStealSheetOpen(true)}
                className="min-h-16 w-full rounded-2xl border-2 border-white text-white font-bold text-xl active:scale-95 transition-transform"
              >
                STEAL A GIFT
              </button>
            ) : (
              <p className="text-white/50 text-sm text-center">No gifts to steal yet</p>
            )
          )}

        </div>

        {/* StealSheet */}
        {stealSheetOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setStealSheetOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[70vh] overflow-y-auto">
              <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-zinc-200">
                <h2 className="font-bold text-[#1A2B4A] text-lg">Steal a Gift</h2>
                <button
                  onClick={() => setStealSheetOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 font-bold text-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-4">
                {stealableGifts.length === 0 ? (
                  <p className="text-center text-zinc-400 text-sm py-8">
                    No gifts available to steal
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stealableGifts.map((gift) => {
                      const holder = players.find((p) => p.id === gift.current_holder)
                      return (
                        <button
                          key={gift.id}
                          onClick={() => stealGift(gift.id)}
                          className="w-full flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-left active:bg-zinc-50 transition-colors"
                        >
                          {gift.image_url ? (
                            <img
                              src={gift.image_url}
                              alt={gift.gift_name}
                              className="w-14 h-14 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                              <span className="text-2xl">🎁</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#1A2B4A] truncate text-sm">
                              {gift.gift_name}
                            </p>
                            {holder && (
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Held by {holder.display_name}
                              </p>
                            )}
                            {/* Steal count: filled dots = stolen, empty = remaining */}
                            <div className="flex gap-1 mt-1.5">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < gift.steal_count ? 'bg-[#B8922A]' : 'bg-zinc-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <span className="text-[#B8922A] font-bold text-sm shrink-0">
                            Steal →
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    )
  }

  // ── Normal mobile layout ──────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#1A2B4A] text-white">

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

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-[#1A2B4A] border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <p className="text-sm font-medium text-white/70">
          {currentTurnPlayer ? (
            <>
              It&apos;s{' '}
              <span className="text-white font-semibold">{currentTurnPlayer.display_name}</span>
              &apos;s turn
            </>
          ) : (
            <span className="text-white/40">Waiting for game to start…</span>
          )}
        </p>
        {isSpectator && (
          <span className="text-xs bg-white/10 rounded-full px-3 py-1 font-medium">
            👁 Spectating
          </span>
        )}
      </div>

      {/* Gift holder — hidden for spectators */}
      {!isSpectator && (
        <div className="px-4 py-3 border-b border-white/10 shrink-0">
          {myGift ? (
            <div className="flex items-center gap-3">
              {myGift.image_url && (
                <img
                  src={myGift.image_url}
                  alt={myGift.gift_name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs text-white/40 mb-0.5">You&apos;re holding</p>
                <p className="text-sm font-semibold truncate">{myGift.gift_name}</p>
                {myGift.steal_count > 0 && (
                  <p className="text-xs text-[#B8922A]">
                    🔄 Stolen {myGift.steal_count}×
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/30">You don&apos;t have a gift yet</p>
          )}
        </div>
      )}

      {/* Scrollable live feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {feedEvents.length === 0 && (
          <p className="text-center text-white/20 text-sm mt-8">
            Feed is quiet… for now.
          </p>
        )}
        {feedEvents.map((event) => {
          const player = players.find((p) => p.id === event.player_id)
          return (
            <div
              key={event.id}
              className="rounded-xl px-3 py-2"
              style={getFeedEventStyle(event)}
            >
              {player && (
                <p className="text-xs font-semibold text-[#B8922A] mb-0.5">
                  {player.role === 'spectator' && <span className="mr-1">👁</span>}
                  {player.display_name}
                </p>
              )}
              <p className="text-sm text-white/80">{event.content}</p>
            </div>
          )
        })}
        <div ref={feedBottomRef} />
      </div>

      {/* Sticky bottom — taunts + emoji bar */}
      <div className="sticky bottom-0 bg-[#1A2B4A] border-t border-white/10 shrink-0">

        {/* Taunt bar — horizontal scroll */}
        <div className="px-4 pt-3 pb-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {TAUNTS.map((taunt) => (
              <button
                key={taunt}
                onClick={() => sendFeedEvent(taunt, 'taunt')}
                className="min-h-10 rounded-full border border-white/20 px-4 py-2 text-sm text-white/60 whitespace-nowrap hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                {taunt}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji bar */}
        <div className="px-4 pb-6 pt-1 grid grid-cols-6 gap-2">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendFeedEvent(emoji, 'reaction')}
              className="min-h-12 rounded-xl bg-white/5 text-2xl flex items-center justify-center active:bg-white/20 active:scale-90 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
