'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGameState } from '@/hooks/useGameState'
import { usePlayers } from '@/hooks/usePlayers'
import { useGifts } from '@/hooks/useGifts'
import { useFeedEvents } from '@/hooks/useFeedEvents'
import { useCurrentPlayer } from '@/hooks/useCurrentPlayer'
import type { FeedEvent } from '@/types'
import { Announcement } from '@/components/brand/Announcement'
import { GiftBox } from '@/components/brand/GiftBox'
import { Logo } from '@/components/brand/Logo'
import { Avatar } from '@/components/brand/Avatar'
import { StatusScreen } from '@/components/brand/Shell'

function getFeedEventStyle(event: FeedEvent): React.CSSProperties {
  if (event.content?.includes('stole'))
    return { backgroundColor: 'rgba(255, 79, 100, 0.28)', border: '2px solid rgba(255, 79, 100, 0.7)' }
  if (event.content?.includes('opened'))
    return { backgroundColor: 'rgba(79, 224, 181, 0.16)', border: '2px solid rgba(79, 224, 181, 0.45)' }
  if (event.content?.includes('locked forever'))
    return { backgroundColor: 'rgba(245, 184, 65, 0.22)', border: '2px solid rgba(245, 184, 65, 0.7)' }
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
  const router = useRouter()

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
  const { currentPlayer, sessionToken } = useCurrentPlayer(players)

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

  // Redirect to recap when host unlocks it
  useEffect(() => {
    if (game?.recap_unlocked) {
      router.push(`/game/${code}/recap`)
    }
  }, [game?.recap_unlocked]) // eslint-disable-line react-hooks/exhaustive-deps

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
    await supabase.rpc('pilfer_react', {
      p_game_id: gameId,
      p_player_id: currentPlayer.id,
      p_session_token: sessionToken,
      p_event_type: eventType,
      p_content: content,
    })
  }

  async function openGift(giftId: string) {
    if (!currentPlayer || !game) return
    const supabase = createClient()
    const { data, error } = await supabase.rpc('pilfer_open_gift', {
      p_game_id: game.id,
      p_player_id: currentPlayer.id,
      p_gift_id: giftId,
      p_session_token: sessionToken,
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
      p_session_token: sessionToken,
    })
    if (error || !data?.success) {
      setErrorMsg(data?.error ?? 'Something went wrong')
    } else {
      setStealSheetOpen(false)
    }
  }

  if (!game) {
    return <StatusScreen title="Loading…" />
  }

  // ── MY TURN full-screen takeover ──────────────────────────────
  if (isMyTurn && !isSpectator && game.status === 'active') {
    return (
      <div className="relative min-h-screen bg-loot flex flex-col items-center justify-center px-6 py-16 gap-7 text-ink">
        <div className="pf-stripes absolute inset-x-0 top-0 h-10" aria-hidden="true" />
        <div className="pf-stripes absolute inset-x-0 bottom-0 h-10" aria-hidden="true" />

        {/* Error toast */}
        {errorMsg && (
          <div className="fixed top-4 inset-x-4 bg-redhanded text-ink border-[3px] border-ink rounded-2xl px-4 py-3 font-extrabold z-[70]">
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
              <Announcement
                kind={stealAnnouncement ? 'steal' : 'lock'}
                text={stealAnnouncement ?? lockAnnouncement ?? ''}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Logo size={120} className="pf-pop -rotate-6" />
        <h1 className="pf-display pf-pop text-center text-7xl text-ink">
          Your turn
        </h1>

        <div className="flex flex-col w-full max-w-xs gap-4">

          {/* OPEN A GIFT */}
          {currentPlayer.role !== 'spectator' && (
            <>
              <button
                disabled={!isMyTurn}
                onClick={() => setOpenPickerVisible((v) => !v)}
                className="pf-btn pf-btn-lg pf-btn-tusk w-full !min-h-16 !text-xl"
              >
                {openPickerVisible ? 'Never mind' : 'Open a gift'}
              </button>

              {openPickerVisible && (
                <div className="w-full rounded-2xl border-[3px] border-ink bg-tusk p-3">
                  {wrappedGifts.length === 0 ? (
                    <p className="text-center text-ink/70 text-sm font-semibold py-2">
                      No gifts left to open
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {wrappedGifts.map((gift, index) => (
                        <button
                          key={gift.id}
                          onClick={() => { openGift(gift.id); setOpenPickerVisible(false) }}
                          aria-label={`Open mystery gift ${index + 1}`}
                          className="flex flex-col items-center justify-center rounded-xl border-[2.5px] border-ink bg-white p-3 active:scale-95 transition-transform"
                        >
                          <GiftBox seed={index} size={64} />
                          <p className="mt-1 text-xs text-ink/60 font-bold">
                            Mystery gift
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
                className="pf-btn pf-btn-lg pf-btn-red w-full !min-h-16 !text-xl"
              >
                Steal a gift
              </button>
            ) : (
              <p className="text-ink/70 text-sm font-semibold text-center">Nothing to steal yet. Open one.</p>
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
            <div className="pf-pop fixed inset-x-0 bottom-0 bg-tusk text-ink rounded-t-3xl border-t-[3px] border-x-[3px] border-ink z-50 max-h-[72vh] overflow-y-auto">
              <div className="sticky top-0 bg-tusk flex items-center justify-between px-4 py-3 border-b-[3px] border-ink">
                <h2 className="pf-display text-ink text-2xl">Pick your target</h2>
                <button
                  onClick={() => setStealSheetOpen(false)}
                  aria-label="Close"
                  className="w-10 h-10 flex items-center justify-center rounded-full border-[2.5px] border-ink bg-white text-ink font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-4">
                {stealableGifts.length === 0 ? (
                  <p className="text-center text-ink/60 text-sm font-semibold py-8">
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
                          className="w-full flex items-center gap-3 rounded-2xl border-[2.5px] border-ink bg-white p-3 text-left active:bg-loot/30 transition-colors"
                        >
                          {gift.image_url ? (
                            <img
                              src={gift.image_url}
                              alt={gift.gift_name}
                              className="w-16 h-16 rounded-xl border-2 border-ink object-cover shrink-0"
                            />
                          ) : (
                            <GiftBox seed={1} size={56} className="shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-ink truncate">
                              {gift.gift_name}
                            </p>
                            {holder && (
                              <p className="text-sm font-medium text-ink/60 mt-0.5">
                                Held by {holder.display_name}
                              </p>
                            )}
                            {/* Steal count: filled dots = stolen, empty = remaining */}
                            <div className="flex gap-1 mt-1.5">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className={`w-2.5 h-2.5 rounded-full border-[1.5px] border-ink ${
                                    i < gift.steal_count ? 'bg-redhanded' : 'bg-white'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <span className="pf-chip pf-chip-live shrink-0">Steal</span>
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
    <div className="pf-page flex flex-col !min-h-0 h-dvh">

      {/* Error toast */}
      {errorMsg && (
        <div className="fixed top-4 inset-x-4 bg-redhanded text-ink border-[3px] border-ink rounded-2xl px-4 py-3 font-extrabold z-[70]">
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
            <Announcement
              kind={stealAnnouncement ? 'steal' : 'lock'}
              text={stealAnnouncement ?? lockAnnouncement ?? ''}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky top bar */}
      {game?.status === 'complete' ? (
        <div className="sticky top-0 z-10 bg-loot text-ink border-b-[3px] border-ink px-4 py-3 shrink-0">
          <p className="font-extrabold text-center">
            That&apos;s the game. Keep chatting, the host will open the recap shortly.
          </p>
        </div>
      ) : (
        <div className="sticky top-0 z-10 bg-alley border-b-[3px] border-ink px-4 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="flex items-center gap-2.5 min-w-0 text-base font-medium text-tusk/70">
            {currentTurnPlayer ? (
              <>
                <Avatar name={currentTurnPlayer.display_name} size={32} />
                <span className="truncate">
                  <span className="text-tusk font-extrabold">{currentTurnPlayer.display_name}</span>
                  &apos;s turn
                </span>
              </>
            ) : (
              <span className="text-tusk/40">Waiting for game to start…</span>
            )}
          </p>
          {isSpectator && (
            <span className="pf-chip pf-chip-quiet shrink-0">Watching</span>
          )}
        </div>
      )}

      {/* Gift holder — hidden for spectators */}
      {!isSpectator && (
        <div className="px-4 py-3 border-b-2 border-tusk/10 bg-midnight/80 shrink-0">
          {myGift ? (
            <div className="flex items-center gap-3">
              {myGift.image_url && (
                <img
                  src={myGift.image_url}
                  alt={myGift.gift_name}
                  className="w-14 h-14 rounded-xl border-2 border-tusk/40 object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-tusk/50 mb-0.5">You&apos;re holding</p>
                <p className="font-extrabold truncate">{myGift.gift_name}</p>
                {myGift.steal_count > 0 && (
                  <p className="text-xs font-bold text-loot">
                    Stolen {myGift.steal_count} {myGift.steal_count === 1 ? 'time' : 'times'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-tusk/50">You don&apos;t have a gift yet</p>
          )}
        </div>
      )}

      {/* Scrollable live feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {feedEvents.length === 0 && (
          <p className="text-center text-tusk/45 text-sm font-medium mt-8">
            All quiet. The first steal changes that.
          </p>
        )}
        {feedEvents.map((event) => {
          const player = players.find((p) => p.id === event.player_id)
          return (
            <div
              key={event.id}
              className="rounded-2xl px-3.5 py-2.5"
              style={getFeedEventStyle(event)}
            >
              {player && (
                <p className="text-xs font-extrabold text-loot mb-0.5">
                  {player.role === 'spectator' && <span className="mr-1" aria-hidden="true">👀</span>}
                  {player.display_name}
                </p>
              )}
              <p className="text-[0.95rem] font-medium text-tusk/90">{event.content}</p>
            </div>
          )
        })}
        <div ref={feedBottomRef} />
      </div>

      {/* Sticky bottom — taunts + emoji bar */}
      <div className="sticky bottom-0 bg-alley border-t-[3px] border-ink shrink-0">

        {/* Taunt bar — horizontal scroll */}
        <div className="px-4 pt-3 pb-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {TAUNTS.map((taunt) => (
              <button
                key={taunt}
                onClick={() => sendFeedEvent(taunt, 'taunt')}
                className="min-h-10 rounded-full border-2 border-tusk/35 px-4 py-2 text-sm font-bold text-tusk/85 whitespace-nowrap hover:bg-tusk/10 active:bg-loot active:text-ink transition-colors"
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
              aria-label={`React with ${emoji}`}
              className="min-h-12 rounded-2xl border-2 border-tusk/15 bg-midnight text-2xl flex items-center justify-center active:bg-loot active:scale-90 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
