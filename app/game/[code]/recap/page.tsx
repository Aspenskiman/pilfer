'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { PartyGame, Player, Gift, Action } from '@/types'

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
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function fetchAll() {
      const { data: gameData } = await supabase
        .from('party_games')
        .select('*')
        .eq('join_code', code.toUpperCase())
        .single()

      if (!gameData) { setLoading(false); return }
      setGame(gameData)

      const [playersRes, giftsRes, actionsRes] = await Promise.all([
        supabase.from('players').select('*').eq('game_id', gameData.id),
        supabase.from('gifts').select('*').eq('game_id', gameData.id),
        supabase.from('actions').select('*').eq('game_id', gameData.id),
      ])

      setPlayers(playersRes.data ?? [])
      setGifts(giftsRes.data ?? [])
      setActions(actionsRes.data ?? [])
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

  // ── Copy link ────────────────────────────────────────────────
  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render guards ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A]">
        <p className="text-white/60">Loading recap…</p>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A] px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game not found</h1>
          <p className="text-white/40 text-sm">This recap isn&apos;t available.</p>
        </div>
      </div>
    )
  }

  if (game.status !== 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A2B4A] px-4">
        <div className="text-center space-y-4">
          <p className="text-white text-lg font-semibold">The game isn&apos;t over yet…</p>
          <Link
            href={`/game/${code}/play`}
            className="inline-flex items-center justify-center min-h-11 px-6 rounded-xl bg-[#B8922A] text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Back to Game
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A2B4A] px-4 py-12">
      <div className="mx-auto max-w-lg space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center space-y-1">
          <p
            className="text-[#B8922A] text-4xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Pilfer
          </p>
          <h1
            className="text-white text-2xl font-bold mt-1"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            {game.game_name}
          </h1>
          <p className="text-white/40 text-xs uppercase tracking-widest font-medium pt-1">
            Game Over
          </p>
        </div>

        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Most Stolen Gift */}
          <div className="bg-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-3">
              🔥 Most Stolen Gift
            </p>
            {mostStolenGift && mostStolenGift.steal_count > 0 ? (
              <>
                <p className="text-white font-bold text-lg leading-tight">
                  {mostStolenGift.gift_name}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  Final holder: {mostStolenHolder?.display_name ?? '—'}
                </p>
                <p className="text-[#B8922A] text-sm font-semibold mt-1">
                  Stolen {mostStolenGift.steal_count}{' '}
                  {mostStolenGift.steal_count === 1 ? 'time' : 'times'}
                </p>
              </>
            ) : (
              <p className="text-white/40 text-sm">No gifts were stolen</p>
            )}
          </div>

          {/* Biggest Thief */}
          <div className="bg-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-3">
              😈 Biggest Thief
            </p>
            {biggestThief && biggestThiefSteals > 0 ? (
              <>
                <p className="text-white font-bold text-lg leading-tight">
                  {biggestThief.display_name}
                </p>
                <p className="text-[#B8922A] text-sm font-semibold mt-1">
                  {biggestThiefSteals}{' '}
                  {biggestThiefSteals === 1 ? 'steal' : 'steals'}
                </p>
              </>
            ) : (
              <p className="text-white/40 text-sm">No steals this game</p>
            )}
          </div>

          {/* Locked Gifts */}
          <div className="bg-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-3">
              🔒 Locked Gifts
            </p>
            {lockedGifts.length > 0 ? (
              <>
                <p className="text-white font-bold text-lg leading-tight">
                  {lockedGifts.length}{' '}
                  {lockedGifts.length === 1 ? 'gift' : 'gifts'} locked
                </p>
                <ul className="mt-2 space-y-1">
                  {lockedGifts.map((g) => (
                    <li key={g.id} className="text-white/50 text-sm">
                      {g.gift_name}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-white/40 text-sm">No gifts reached 3 steals</p>
            )}
          </div>

          {/* Players */}
          <div className="bg-white/10 rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-3">
              Players
            </p>
            <p className="text-white font-bold text-lg leading-tight">
              {participants.length}{' '}
              {participants.length === 1 ? 'participant' : 'participants'}
            </p>
            {spectators.length > 0 && (
              <p className="text-white/50 text-sm mt-1">
                👁 {spectators.length}{' '}
                {spectators.length === 1 ? 'spectator' : 'spectators'}
              </p>
            )}
          </div>

        </div>

        {/* ── Share ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <p
            className="text-white text-center font-semibold"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Share your game recap
          </p>
          <button
            onClick={handleCopyLink}
            className="w-full min-h-12 rounded-xl border border-white/20 text-white font-semibold text-sm transition-colors hover:bg-white/10 active:bg-white/20"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* ── Play again ─────────────────────────────────────── */}
        <Link
          href="/dashboard/new"
          className="flex items-center justify-center w-full min-h-12 rounded-xl bg-[#B8922A] text-white font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Host a new game
        </Link>

      </div>
    </div>
  )
}
