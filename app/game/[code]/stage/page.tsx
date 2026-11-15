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
import { Announcement } from '@/components/brand/Announcement'
import { GiftBox } from '@/components/brand/GiftBox'
import { Avatar } from '@/components/brand/Avatar'
import { StatusScreen } from '@/components/brand/Shell'

function getFeedEventStyle(event: FeedEvent): React.CSSProperties {
  if (event.content?.includes('stole'))
    return { backgroundColor: 'rgba(255, 79, 100, 0.28)', border: '2px solid rgba(255, 79, 100, 0.7)' }
  if (event.content?.includes('opened'))
    return { backgroundColor: 'rgba(79, 224, 181, 0.16)', border: '2px solid rgba(79, 224, 181, 0.45)' }
  if (event.content?.includes('locked forever'))
    return { backgroundColor: 'rgba(245, 184, 65, 0.22)', border: '2px solid rgba(245, 184, 65, 0.7)' }
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
    return <StatusScreen title="Loading…" />
  }

  // Game over banner
  if (game.status === 'complete') {
    return (
      <StatusScreen
        title="That's the game"
        action={
          isHost ? (
            <button onClick={endGame} className="pf-btn pf-btn-lg pf-btn-loot">
              End the game and show the recap
            </button>
          ) : undefined
        }
      >
        <p>{game.game_name}</p>
        {!isHost && <p className="mt-2 text-base text-tusk/50">Waiting for the host to open the recap.</p>}
      </StatusScreen>
    )
  }

  // Waiting / pre-game state
  if (game.status !== 'active') {
    return (
      <StatusScreen title="Almost showtime">
        <p>Waiting for the host to start the game.</p>
      </StatusScreen>
    )
  }

  return (
    <div className="pf-page flex !min-h-0 h-screen overflow-hidden">

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

      {/* Host action overlay */}
      {hostActionMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setHostActionMode(null)} />
          <div className="pf-panel pf-pop relative z-10 w-full max-w-sm mx-4 !border-loot p-5">
            <h3 className="pf-display text-2xl text-tusk mb-4">
              {hostActionMode === 'open' ? 'Open a gift for ' : 'Steal a gift for '}
              {currentTurnPlayer?.display_name}
            </h3>

            {hostActionMode === 'open' && (
              <div className="flex flex-wrap gap-2">
                {wrappedGifts.length === 0 ? (
                  <p className="text-tusk/40 text-sm">No wrapped gifts remaining.</p>
                ) : wrappedGifts.map((gift, index) => (
                  <button
                    key={gift.id}
                    onClick={() => { openGiftForPlayer(gift.id); setHostActionMode(null) }}
                    className="flex flex-col items-center justify-center w-24 rounded-xl border-2 border-tusk/20 p-2 hover:border-loot active:scale-95 transition-all"
                  >
                    <GiftBox seed={index} size={56} />
                    <span className="text-xs font-bold text-tusk/70 mt-1">Gift {index + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {hostActionMode === 'steal' && (
              <div className="space-y-2">
                {hostStealableGifts.length === 0 ? (
                  <p className="text-tusk/40 text-sm">No stealable gifts available.</p>
                ) : hostStealableGifts.map((gift) => {
                  const holder = players.find((p) => p.id === gift.current_holder)
                  return (
                    <button
                      key={gift.id}
                      onClick={() => { stealGiftForPlayer(gift.id); setHostActionMode(null) }}
                      className="w-full flex items-center gap-3 rounded-xl border-2 border-tusk/20 px-3 py-2.5 text-left hover:border-loot active:scale-[0.98] transition-all"
                    >
                      <GiftBox seed={1} size={36} className="shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{gift.gift_name}</p>
                        {holder && (
                          <p className="text-[11px] text-tusk/40">Held by {holder.display_name}</p>
                        )}
                      </div>
                      <span className="pf-chip pf-chip-live shrink-0 ml-auto">Steal</span>
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setHostActionMode(null)}
              className="pf-btn pf-btn-sm pf-btn-ghost mt-4 w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── LEFT COLUMN — Players ──────────────────────────────── */}
      <div className="w-1/5 border-r-2 border-tusk/10 bg-midnight/70 flex flex-col min-w-0">
        <h2 className="px-4 py-4 text-lg font-extrabold text-tusk shrink-0">
          The crew
        </h2>
        <ul className="flex-1 overflow-y-auto divide-y divide-tusk/5">
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
                  'px-3 py-3 flex items-center justify-between gap-2 transition-colors',
                  isCurrent
                    ? 'bg-loot/20 border-l-4 border-loot'
                    : 'border-l-4 border-transparent',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Avatar name={player.display_name} size={30} />
                  <span className={`truncate font-bold ${player.role === 'spectator' ? 'text-tusk/50' : 'text-tusk'}`}>
                    {player.display_name}
                  </span>
                </span>
                {isHost && isCurrent ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setHostActionMode('open')}
                      className="text-xs font-extrabold px-2 py-1 rounded-lg border-2 border-ink bg-tusk text-ink hover:bg-loot transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setHostActionMode('steal')}
                      className="text-xs font-extrabold px-2 py-1 rounded-lg border-2 border-ink bg-tusk text-ink hover:bg-loot transition-colors"
                    >
                      Steal
                    </button>
                  </div>
                ) : (
                  hasGift ? <GiftBox seed={1} size={24} className="shrink-0" title="Holding a gift" /> : null
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── CENTER COLUMN — Game ───────────────────────────────── */}
      <div className="w-3/5 flex flex-col overflow-hidden border-r-2 border-tusk/10">

        {/* Turn bar */}
        <div className="px-6 py-4 bg-alley border-b-[3px] border-ink flex items-center justify-between gap-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {currentTurnPlayer && <Avatar name={currentTurnPlayer.display_name} size={52} />}
            <div className="min-w-0">
              <p className="text-sm font-bold text-loot">Up now</p>
              <p className="pf-display truncate text-4xl text-tusk">
                {currentTurnPlayer?.display_name ?? 'Nobody yet'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-tusk/50">On deck</p>
            <p className="text-xl font-extrabold text-tusk/85">
              {onDeckPlayer?.display_name ?? 'Last turn'}
            </p>
          </div>
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
                  className="pf-display text-5xl text-tusk"
                >
                  {game.game_name}
                </h1>
                {joinUrl && (
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="rounded-xl border-[3px] border-ink bg-white p-1.5">
                      <QRCodeSVG value={joinUrl} size={80} />
                    </div>
                    <p className="text-xs font-bold text-tusk/50">Scan to watch</p>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Wrapped gifts */}
          {wrappedGifts.length > 0 && (
            <section>
              <h3 className="text-lg font-extrabold text-tusk/70 mb-3">
                {wrappedGifts.length} still wrapped
              </h3>
              <div className="flex flex-wrap gap-3">
                {wrappedGifts.map((gift, index) => (
                  <div
                    key={gift.id}
                    className="relative flex flex-col items-center select-none"
                  >
                    <GiftBox seed={index} size={96} className={index % 2 === 0 ? '-rotate-3' : 'rotate-3'} />
                    <span className="text-xs font-bold text-tusk/55 mt-1">Gift {index + 1}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Opened gifts */}
          {openedGifts.length > 0 && (
            <section>
              <h3 className="text-lg font-extrabold text-tusk/70 mb-3">
                {openedGifts.length} opened
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {openedGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className={`relative rounded-2xl bg-tusk text-ink border-[3px] border-ink overflow-hidden ${
                      gift.is_locked ? 'shadow-[5px_5px_0_0_var(--pf-loot)]' : ''
                    }`}
                  >
                    {gift.is_locked && (
                      <span className="pf-chip absolute top-2 right-2 z-10 !bg-loot">Locked</span>
                    )}
                    {gift.image_url ? (
                      <img
                        src={gift.image_url}
                        alt={gift.gift_name}
                        className="w-full max-h-44 object-contain bg-ink/10 border-b-[3px] border-ink"
                      />
                    ) : (
                      <div className="w-full h-24 bg-ink/5 border-b-[3px] border-ink flex items-center justify-center px-2">
                        <p className="text-sm font-bold text-ink/50 text-center leading-tight line-clamp-3">
                          {gift.gift_name}
                        </p>
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="font-extrabold truncate">{gift.gift_name}</p>
                      <div className="flex items-center gap-1 mt-1.5" title={`Stolen ${gift.steal_count} of 3 times`}>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full border-[1.5px] border-ink ${
                              i < gift.steal_count ? 'bg-redhanded' : 'bg-white'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-xs font-bold text-ink/60">
                          {gift.steal_count === 0
                            ? 'Not stolen yet'
                            : `${gift.steal_count} steal${gift.steal_count !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {gifts.length === 0 && (
            <p className="text-center text-tusk/50 font-medium pt-12">
              No gifts yet.
            </p>
          )}


        </div>
      </div>

      {/* ── RIGHT COLUMN — Live Feed ───────────────────────────── */}
      <div className="w-1/5 bg-midnight/70 flex flex-col min-w-0">
        <h2 className="px-4 py-4 text-lg font-extrabold text-tusk shrink-0">
          Live feed
        </h2>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {feedEvents.length === 0 && (
            <p className="text-center text-tusk/45 text-sm font-medium pt-4">All quiet. The first steal changes that.</p>
          )}
          {feedEvents.map((event) => {
            const player = players.find((p) => p.id === event.player_id)
            return (
              <div
                key={event.id}
                className="rounded-2xl p-3 space-y-0.5"
                style={getFeedEventStyle(event)}
              >
                {player && (
                  <p className="text-xs font-extrabold text-loot mb-0.5 truncate">
                    {player.role === 'spectator' && <span className="mr-1" aria-hidden="true">👀</span>}
                    {player.display_name}
                  </p>
                )}
                <p className="text-sm font-medium text-tusk/90 leading-snug">{event.content}</p>
              </div>
            )
          })}
          <div ref={feedBottomRef} />
        </div>
      </div>

    </div>
  )
}
