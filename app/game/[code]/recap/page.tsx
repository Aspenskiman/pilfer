'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { StatusScreen } from '@/components/brand/Shell'
import { Logo } from '@/components/brand/Logo'
import { Confetti } from '@/components/brand/Confetti'
import { createClient } from '@/lib/supabase'
import type { PartyGame, Player, Gift, Action } from '@/types'
import { track } from '@/lib/analytics'
import { PLAYER_COLUMNS, GIFT_COLUMNS, LOCAL_STORAGE_PLAYER_KEY, LOCAL_STORAGE_TOKEN_KEY } from '@/constants/game'

export default function RecapPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)

  const [game, setGame] = useState<PartyGame | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [gifts, setGifts] = useState<Gift[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [delivery, setDelivery] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setCurrentPlayerId(localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function fetchAll() {
      const [{ data: gameData }, { data: { user } }] = await Promise.all([
        supabase.from('party_games').select('*').eq('join_code', code.toUpperCase()).single(),
        supabase.auth.getUser(),
      ])

      if (!gameData) { setLoading(false); return }
      setGame(gameData)
      setUserId(user?.id ?? null)

      const [playersRes, giftsRes, actionsRes] = await Promise.all([
        supabase.from('players').select(PLAYER_COLUMNS).eq('game_id', gameData.id),
        supabase.from('gifts').select(GIFT_COLUMNS).eq('game_id', gameData.id),
        supabase.from('actions').select('*').eq('game_id', gameData.id),
      ])

      setPlayers((playersRes.data ?? []) as unknown as Player[])
      setGifts((giftsRes.data ?? []) as unknown as Gift[])
      setActions(actionsRes.data ?? [])

      // Delivery info is private: the database only returns the rows this
      // viewer is allowed to see (host: all; player: the gift they won).
      const { data: deliveryRows } = await supabase.rpc('pilfer_get_delivery', {
        p_game_id: gameData.id,
        p_player_id: localStorage.getItem(LOCAL_STORAGE_PLAYER_KEY),
        p_session_token: localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY),
      })
      const map: Record<string, string | null> = {}
      for (const row of (deliveryRows ?? []) as { gift_id: string; delivery_info: string | null }[]) {
        map[row.gift_id] = row.delivery_info
      }
      setDelivery(map)
      if (gameData.status === 'complete') track('recap_viewed')
      setLoading(false)
    }

    fetchAll()
  }, [code])

  // ── Stat derivations ─────────────────────────────────────────

  // Most stolen gift: highest steal_count
  const mostStolenGift = gifts.length > 0
    ? [...gifts].sort((a, b) => b.steal_count - a.steal_count)[0]
    : null
  const mostStolenHolder = mostStolenGift
    ? players.find((p) => p.id === mostStolenGift.current_holder) ?? null
    : null

  // Biggest thief: actor_id with most steal actions
  const stealsByActor: Record<string, number> = {}
  actions
    .filter((a) => a.action_type === 'steal' && a.actor_id)
    .forEach((a) => {
      stealsByActor[a.actor_id!] = (stealsByActor[a.actor_id!] ?? 0) + 1
    })
  const biggestThiefEntry = Object.entries(stealsByActor)
    .sort(([, a], [, b]) => b - a)[0] ?? null
  const biggestThief = biggestThiefEntry
    ? players.find((p) => p.id === biggestThiefEntry[0]) ?? null
    : null
  const biggestThiefSteals = biggestThiefEntry ? biggestThiefEntry[1] : 0

  // Locked gifts
  const lockedGifts = gifts.filter((g) => g.is_locked)

  // Player breakdown
  const participants = players.filter((p) => p.role === 'participant')
  const spectators = players.filter((p) => p.role === 'spectator')

  // ── Gift Exchange derivations ────────────────────────────────
  const isHost = !!userId && !!game && userId === game.host_id
  const myWonGift = gifts.find((g) => g.current_holder === currentPlayerId) ?? null
  const mySubmittedGift = gifts.find((g) => g.submitted_by === currentPlayerId) ?? null
  const mySubmittedGiftWinner = mySubmittedGift
    ? players.find((p) => p.id === mySubmittedGift.current_holder) ?? null
    : null

  // ── Copy link ────────────────────────────────────────────────
  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render guards ────────────────────────────────────────────
  if (loading) {
    return <StatusScreen title="Loading the recap…" />
  }

  if (!game) {
    return (
      <StatusScreen title="Game not found">
        <p>This recap isn&apos;t available.</p>
      </StatusScreen>
    )
  }

  if (game.status !== 'complete') {
    return (
      <StatusScreen
        title="Not over yet"
        action={
          <Link href={`/game/${code}/play`} className="pf-btn pf-btn-loot">
            Back to the game
          </Link>
        }
      >
        <p>The recap opens when the host ends the game.</p>
      </StatusScreen>
    )
  }

  return (
    <div className="pf-page px-4 py-12">
      <Confetti />
      <div className="mx-auto max-w-lg space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center">
          <Logo size={112} className="mx-auto -rotate-6" />
          <p className="mt-4 font-bold text-loot">Pilfer recap</p>
          <h1 className="pf-display mt-1 text-5xl text-tusk">{game.game_name}</h1>
          <p className="mt-3 text-lg font-medium text-tusk/60">
            Every gift has a home. Here&apos;s how it went down.
          </p>
        </div>

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Most Stolen Gift */}
          <div className="pf-panel p-5">
            <p className="text-sm font-extrabold text-loot mb-2">
              Most stolen gift
            </p>
            {mostStolenGift && mostStolenGift.steal_count > 0 ? (
              <>
                <p className="pf-display text-tusk text-3xl">
                  {mostStolenGift.gift_name}
                </p>
                <p className="text-tusk/60 text-sm font-medium mt-1">
                  Final holder: {mostStolenHolder?.display_name ?? '—'}
                </p>
                <p className="text-loot text-sm font-semibold mt-1">
                  Stolen {mostStolenGift.steal_count}{' '}
                  {mostStolenGift.steal_count === 1 ? 'time' : 'times'}
                </p>
              </>
            ) : (
              <p className="text-tusk/55 font-medium">No gifts were stolen</p>
            )}
          </div>

          {/* Biggest Thief */}
          <div className="pf-panel p-5">
            <p className="text-sm font-extrabold text-loot mb-2">
              Biggest thief
            </p>
            {biggestThief && biggestThiefSteals > 0 ? (
              <>
                <p className="pf-display text-tusk text-3xl">
                  {biggestThief.display_name}
                </p>
                <p className="text-loot text-sm font-semibold mt-1">
                  {biggestThiefSteals}{' '}
                  {biggestThiefSteals === 1 ? 'steal' : 'steals'}
                </p>
              </>
            ) : (
              <p className="text-tusk/55 font-medium">No steals this game</p>
            )}
          </div>

          {/* Locked Gifts */}
          <div className="pf-panel p-5">
            <p className="text-sm font-extrabold text-loot mb-2">
              Locked for good
            </p>
            {lockedGifts.length > 0 ? (
              <>
                <p className="pf-display text-tusk text-3xl">
                  {lockedGifts.length}{' '}
                  {lockedGifts.length === 1 ? 'gift' : 'gifts'} locked
                </p>
                <ul className="mt-2 space-y-1">
                  {lockedGifts.map((g) => (
                    <li key={g.id} className="text-tusk/60 text-sm font-medium">
                      {g.gift_name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-tusk/55 font-medium">No gifts reached 3 steals</p>
            )}
          </div>

          {/* Players */}
          <div className="pf-panel p-5">
            <p className="text-sm font-extrabold text-loot mb-2">
              Players
            </p>
            <p className="pf-display text-tusk text-3xl">
              {participants.length}{' '}
              {participants.length === 1 ? 'player' : 'players'}
            </p>
            {spectators.length > 0 && (
              <p className="text-tusk/60 text-sm font-medium mt-1">
                {spectators.length}{' '}
                {spectators.length === 1 ? 'spectator' : 'spectators'}
              </p>
            )}
          </div>

        </div>

        {/* ── Gift Exchange ──────────────────────────────────── */}
        <div className="space-y-4">
          <h2
            className="pf-display text-tusk text-4xl"
          >
            Who got what
          </h2>

          {/* Player view */}
          {currentPlayerId && !isHost && (
            <div className="space-y-3">

              {/* Gift you won */}
              {myWonGift ? (
                <div className="pf-paper overflow-hidden">
                  {myWonGift.image_url && (
                    <img
                      src={myWonGift.image_url}
                      alt={myWonGift.gift_name}
                      className="w-full max-h-56 object-contain bg-ink/10 border-b-[3px] border-ink"
                    />
                  )}
                  <div className="p-4 space-y-3">
                    <p className="text-sm font-extrabold text-[#b3122b]">
                      You&apos;re going home with
                    </p>
                    <p className="pf-display text-ink text-3xl">
                      {myWonGift.gift_name}
                    </p>
                    {delivery[myWonGift.id] && (
                      <div className="rounded-xl bg-loot border-[2.5px] border-ink px-4 py-3">
                        <p className="text-xs font-extrabold text-ink/70 mb-1">
                          How to claim it
                        </p>
                        <p className="text-ink font-semibold leading-snug">
                          {delivery[myWonGift.id]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pf-panel p-4">
                  <p className="text-tusk/60 font-medium">You didn&apos;t end up with a gift.</p>
                </div>
              )}

              {/* Gift you submitted */}
              {mySubmittedGift && (
                <div className="pf-panel p-4 space-y-1">
                  <p className="text-sm font-extrabold text-loot">
                    Your gift went to
                  </p>
                  <p className="pf-display text-tusk text-2xl">
                    {mySubmittedGiftWinner?.display_name ?? '—'}
                  </p>
                  <p className="text-tusk/60 text-sm font-medium">{mySubmittedGift.gift_name}</p>
                </div>
              )}
            </div>
          )}

          {/* Host view — full table */}
          {isHost && (
            <div className="pf-panel overflow-hidden">
              <div className="divide-y-2 divide-tusk/10">
                {gifts.map((gift) => {
                  const submitter = players.find((p) => p.id === gift.submitted_by)
                  const winner = players.find((p) => p.id === gift.current_holder)
                  return (
                    <div key={gift.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-tusk font-extrabold leading-tight">
                          {gift.gift_name}
                        </p>
                        {gift.is_locked && (
                          <span className="pf-chip shrink-0 !bg-loot">Locked</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-tusk/55">
                        <span>From: <span className="text-tusk/70">{submitter?.display_name ?? '—'}</span></span>
                        <span>Won by: <span className="text-tusk/70">{winner?.display_name ?? '—'}</span></span>
                      </div>
                      {delivery[gift.id] && (
                        <div className="rounded-lg bg-loot/15 border border-loot/30 px-3 py-2">
                          <p className="text-xs text-loot font-extrabold mb-0.5">Delivery info</p>
                          <p className="text-tusk/90 text-sm leading-snug">{delivery[gift.id]}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Share ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <p
            className="text-tusk text-center text-lg font-extrabold"
          >
            Share your game recap
          </p>
          <button
            onClick={handleCopyLink}
            className="pf-btn pf-btn-tusk w-full"
          >
            {copied ? 'Link copied' : 'Copy the recap link'}
          </button>
        </div>

        {/* ── Play again ─────────────────────────────────────── */}
        <Link
          href="/dashboard/new"
          className="pf-btn pf-btn-lg pf-btn-loot w-full"
        >
          Host a new game
        </Link>

      </div>
    </div>
  )
}
