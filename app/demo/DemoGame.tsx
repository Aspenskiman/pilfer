'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useReducer, useState } from 'react'
import { Announcement } from '@/components/brand/Announcement'
import { Avatar } from '@/components/brand/Avatar'
import { Confetti } from '@/components/brand/Confetti'
import { GiftBox } from '@/components/brand/GiftBox'
import { PageShell, TopBar } from '@/components/brand/Shell'

/**
 * A complete game of Pilfer against four computer players, running entirely in
 * the browser. Nothing is saved and no account is needed. The rules match the
 * real game: open or steal, a revenge turn for whoever was robbed, no stealing
 * a gift straight back, and a lock on the third steal.
 */

const MAX_STEALS = 3
const YOU = 'you'

type Player = { id: string; name: string; bot: boolean }
type Gift = {
  id: string
  name: string
  src: string
  wrap: number
  opened: boolean
  holder: string | null
  steals: number
  locked: boolean
}
type Shout = { kind: 'steal' | 'lock'; text: string }
type FeedItem = { id: number; text: string; tone: 'open' | 'steal' | 'lock' }
type State = {
  phase: 'intro' | 'playing' | 'done'
  players: Player[]
  gifts: Gift[]
  turnIdx: number // position in the main turn order
  current: string // whose move it is right now (may be a revenge turn)
  revenge: boolean
  blocked: { giftId: string; playerId: string } | null // no stealing straight back
  chain: number // steals in a row since the last open
  feed: FeedItem[]
  shout: (Shout & { id: number }) | null
  newest: string | null // gift that was just opened or just moved
  tick: number
}
type Action =
  | { type: 'start' }
  | { type: 'open'; giftId: string }
  | { type: 'steal'; giftId: string }
  | { type: 'bot'; roll: number; pick: number }
  | { type: 'clearShout'; id: number }

const PLAYERS: Player[] = [
  { id: 'maya', name: 'Maya', bot: true },
  { id: YOU, name: 'You', bot: false },
  { id: 'dan', name: 'Dan', bot: true },
  { id: 'priya', name: 'Priya', bot: true },
  { id: 'sam', name: 'Sam', bot: true },
]

const PRIZES: Omit<Gift, 'opened' | 'holder' | 'steals' | 'locked' | 'wrap'>[] = [
  { id: 'fryer', name: 'Air fryer', src: '/art/prize-fryer.webp' },
  { id: 'slippers', name: 'Llama slippers', src: '/art/prize-slippers.webp' },
  { id: 'sauce', name: 'Hot sauce set', src: '/art/prize-sauce.webp' },
  { id: 'mic', name: 'Karaoke mic', src: '/art/prize-mic.webp' },
  { id: 'plush', name: 'Burglar elephant plush', src: '/pilfer-logo.png' },
]

function freshState(phase: State['phase']): State {
  return {
    phase,
    players: PLAYERS,
    gifts: PRIZES.map((p, i) => ({ ...p, wrap: i, opened: false, holder: null, steals: 0, locked: false })),
    turnIdx: 0,
    current: PLAYERS[0].id,
    revenge: false,
    blocked: null,
    chain: 0,
    feed: [],
    shout: null,
    newest: null,
    tick: 0,
  }
}

const nameOf = (s: State, id: string) => s.players.find((p) => p.id === id)?.name ?? ''
const subject = (s: State, id: string) => (id === YOU ? 'You' : nameOf(s, id))
const object = (s: State, id: string) => (id === YOU ? 'you' : nameOf(s, id))

/** Gifts the given player may steal right now. */
function stealable(s: State, playerId: string): Gift[] {
  return s.gifts.filter(
    (g) =>
      g.opened &&
      !g.locked &&
      g.holder !== playerId &&
      !(s.blocked && s.blocked.giftId === g.id && s.blocked.playerId === playerId)
  )
}

function pushFeed(s: State, text: string, tone: FeedItem['tone']): FeedItem[] {
  return [{ id: s.tick, text, tone }, ...s.feed].slice(0, 5)
}

function doOpen(s: State, giftId: string): State {
  const gift = s.gifts.find((g) => g.id === giftId)
  if (!gift || gift.opened) return s
  const gifts = s.gifts.map((g) => (g.id === giftId ? { ...g, opened: true, holder: s.current } : g))
  const feed = pushFeed(s, `${subject(s, s.current)} opened the ${gift.name.toLowerCase()}`, 'open')
  const tick = s.tick + 1
  // Opening ends the chain. The game is over once every gift is open.
  if (gifts.every((g) => g.opened)) {
    return { ...s, gifts, feed, tick, phase: 'done', blocked: null, revenge: false, newest: giftId, chain: 0 }
  }
  const turnIdx = s.revenge ? s.turnIdx : s.turnIdx + 1
  // After a chain, play returns to the next person in order who has no gift yet.
  let idx = turnIdx
  while (idx < s.players.length && gifts.some((g) => g.holder === s.players[idx].id)) idx++
  const next = s.players[Math.min(idx, s.players.length - 1)]
  return { ...s, gifts, feed, tick, turnIdx: idx, current: next.id, revenge: false, blocked: null, newest: giftId, chain: 0 }
}

function doSteal(s: State, giftId: string): State {
  const gift = s.gifts.find((g) => g.id === giftId)
  if (!gift || !gift.holder || !stealable(s, s.current).some((g) => g.id === giftId)) return s
  const victim = gift.holder
  const steals = gift.steals + 1
  const locked = steals >= MAX_STEALS
  const gifts = s.gifts.map((g) => (g.id === giftId ? { ...g, holder: s.current, steals, locked } : g))
  const what = gift.name.toLowerCase()
  const stealText = `${subject(s, s.current)} stole the ${what} from ${object(s, victim)}`
  let feed = pushFeed(s, stealText, 'steal')
  if (locked) feed = [{ id: s.tick + 0.5, text: `The ${what} is locked`, tone: 'lock' as const }, ...feed].slice(0, 5)
  const shout: State['shout'] = locked
    ? { id: s.tick, kind: 'lock', text: `Third steal. The ${what} stays with ${object(s, s.current)}.` }
    : { id: s.tick, kind: 'steal', text: stealText }
  // Whoever was robbed moves next, and may not take the same gift straight back.
  const turnIdx = s.revenge ? s.turnIdx : s.turnIdx + 1
  return {
    ...s,
    gifts,
    feed,
    shout,
    tick: s.tick + 1,
    turnIdx,
    current: victim,
    revenge: true,
    blocked: { giftId, playerId: victim },
    newest: giftId,
    chain: s.chain + 1,
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'start':
      return freshState('playing')
    case 'clearShout':
      return s.shout && s.shout.id === a.id ? { ...s, shout: null } : s
    case 'open':
      return s.phase === 'playing' && s.current === YOU ? doOpen(s, a.giftId) : s
    case 'steal':
      return s.phase === 'playing' && s.current === YOU ? doSteal(s, a.giftId) : s
    case 'bot': {
      if (s.phase !== 'playing' || s.current === YOU) return s
      const targets = stealable(s, s.current)
      const wrapped = s.gifts.filter((g) => !g.opened)
      // Bots like to steal, like stealing from you even more, and get bored of long chains.
      const yours = targets.filter((g) => g.holder === YOU)
      const wantsSteal = targets.length > 0 && s.chain < 3 && a.roll < (yours.length ? 0.65 : 0.45)
      if (wantsSteal || wrapped.length === 0) {
        const pool = yours.length && a.roll < 0.4 ? yours : targets
        if (pool.length) return doSteal(s, pool[Math.floor(a.pick * pool.length)].id)
      }
      return wrapped.length ? doOpen(s, wrapped[Math.floor(a.pick * wrapped.length)].id) : s
    }
  }
}

export function DemoGame() {
  const [s, dispatch] = useReducer(reducer, 'intro' as const, freshState)
  const [picking, setPicking] = useState<'open' | 'steal' | null>(null)

  const myTurn = s.phase === 'playing' && s.current === YOU && !s.shout
  const shoutId = s.shout?.id

  // Announcements clear themselves.
  useEffect(() => {
    if (shoutId == null) return
    const t = setTimeout(() => dispatch({ type: 'clearShout', id: shoutId }), 2000)
    return () => clearTimeout(t)
  }, [shoutId])

  // Bots take a moment to think, and wait for any announcement to finish.
  useEffect(() => {
    if (s.phase !== 'playing' || s.current === YOU || s.shout) return
    const t = setTimeout(() => dispatch({ type: 'bot', roll: Math.random(), pick: Math.random() }), 1500)
    return () => clearTimeout(t)
  }, [s.phase, s.current, s.shout, s.tick])

  const wrapped = s.gifts.filter((g) => !g.opened)
  const opened = s.gifts.filter((g) => g.opened)
  const targets = myTurn ? stealable(s, YOU) : []
  const mine = s.gifts.find((g) => g.holder === YOU)
  const up = s.players.find((p) => p.id === s.current)!
  const mostStolen = [...s.gifts].sort((a, b) => b.steals - a.steals)[0]

  function act(action: Action) {
    setPicking(null)
    dispatch(action)
  }

  return (
    <PageShell className="flex min-h-screen flex-col">
      <TopBar maxWidth="max-w-3xl">
        <span className="pf-chip pf-chip-quiet hidden sm:inline-flex">Demo game</span>
        <Link href="/signup" className="pf-btn pf-btn-sm pf-btn-loot whitespace-nowrap">
          Host a game
        </Link>
      </TopBar>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 sm:px-6">
        {s.phase === 'intro' && (
          <div className="pf-paper mt-6 overflow-hidden">
            <div className="pf-stripes h-8 border-b-[3px] border-ink" aria-hidden="true" />
            <div className="p-6 sm:p-9">
              <h1 className="pf-display text-5xl sm:text-6xl">Play a quick game</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/75">
                Five players, five wrapped gifts. You are up against Maya, Dan, Priya and Sam, who
                are all computer players and none of whom can be trusted.
              </p>
              <ul className="mt-5 space-y-2 text-lg font-medium text-ink/85">
                <li>On your turn, open a wrapped gift or steal one that is already open.</li>
                <li>If someone steals from you, you go again right away.</li>
                <li>The third steal locks a gift for good.</li>
              </ul>
              <div className="mt-7 flex flex-wrap items-end gap-1 sm:gap-2" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <GiftBox key={i} seed={i} size={52} className={i % 2 ? 'rotate-3' : '-rotate-3'} />
                ))}
              </div>
              <button onClick={() => dispatch({ type: 'start' })} className="pf-btn pf-btn-lg pf-btn-red mt-8 w-full sm:w-auto">
                Start the demo
              </button>
              <p className="mt-3 text-sm font-medium text-ink/60">Takes about three minutes. Nothing is saved.</p>
            </div>
          </div>
        )}

        {s.phase !== 'intro' && (
          <>
            {/* Whose move it is */}
            <div
              className={`mt-4 flex items-center justify-between gap-4 rounded-3xl border-[3px] border-ink px-5 py-4 text-ink shadow-[0_6px_0_0_var(--pf-ink)] ${
                s.phase === 'done' ? 'bg-mint' : s.current === YOU ? 'bg-redhanded' : 'bg-loot'
              }`}
              aria-live="polite"
            >
              {s.phase === 'done' ? (
                <p className="pf-display text-3xl sm:text-4xl">Game over</p>
              ) : (
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar key={up.id} name={up.name} size={52} className="pf-pop !bg-tusk" />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink/70">{s.revenge ? 'Revenge turn' : 'Up now'}</p>
                    <p className="pf-display truncate text-3xl sm:text-4xl">
                      {s.current === YOU ? 'Your turn' : up.name}
                    </p>
                  </div>
                </div>
              )}
              <p className="hidden shrink-0 text-right text-sm font-extrabold text-ink/75 sm:block">
                {mine ? (
                  <>
                    You hold
                    <br />
                    <span className="text-base text-ink">{mine.name}</span>
                  </>
                ) : (
                  'You hold nothing yet'
                )}
              </p>
            </div>

            {/* The end */}
            {s.phase === 'done' && (
              <div className="pf-paper pf-pop mb-6 mt-6 overflow-hidden">
                <Confetti />
                <div className="pf-stripes h-8 border-b-[3px] border-ink" aria-hidden="true" />
                <div className="p-6 sm:p-9">
                  <h2 className="pf-display text-4xl sm:text-5xl">
                    {mine ? `You went home with the ${mine.name.toLowerCase()}.` : 'That is the game.'}
                  </h2>
                  {mostStolen.steals > 0 && (
                    <p className="mt-3 text-lg font-medium text-ink/75">
                      Most fought-over gift: {mostStolen.name.toLowerCase()}, stolen {mostStolen.steals}{' '}
                      {mostStolen.steals === 1 ? 'time' : 'times'}.
                    </p>
                  )}
                  <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink/75">
                    Now picture it with your own people, their own gifts and a big screen showing every
                    steal. Each player uses their own phone.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Link href="/signup" className="pf-btn pf-btn-lg pf-btn-red">
                      Host a free game
                    </Link>
                    <button onClick={() => dispatch({ type: 'start' })} className="pf-btn pf-btn-lg pf-btn-plain">
                      Play again
                    </button>
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink/60">Free for up to 5 players. No card needed.</p>
                </div>
              </div>
            )}

            <p className="mt-3 text-center text-sm font-bold text-tusk/70 sm:hidden">
              {mine ? `You hold the ${mine.name.toLowerCase()}` : 'You hold nothing yet'}
            </p>

            {/* Your move */}
            {myTurn && (
              <div className="pf-pop mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setPicking(picking === 'open' ? null : 'open')}
                  disabled={wrapped.length === 0}
                  className="pf-btn pf-btn-lg pf-btn-tusk"
                >
                  {picking === 'open' ? 'Pick a wrapped gift below' : 'Open a gift'}
                </button>
                <button
                  onClick={() => setPicking(picking === 'steal' ? null : 'steal')}
                  disabled={targets.length === 0}
                  className="pf-btn pf-btn-lg pf-btn-red"
                >
                  {targets.length === 0
                    ? 'Nothing to steal'
                    : picking === 'steal'
                      ? 'Pick your target below'
                      : 'Steal a gift'}
                </button>
              </div>
            )}

            {/* Wrapped gifts */}
            {wrapped.length > 0 && (
              <section className="pf-table mt-5">
                <h2 className="mb-3 text-base font-extrabold text-tusk/70">{wrapped.length} still wrapped</h2>
                <div className="flex flex-wrap gap-3">
                  {wrapped.map((g, i) => {
                    const pickable = myTurn && picking === 'open'
                    return (
                      <button
                        key={g.id}
                        disabled={!pickable}
                        onClick={() => act({ type: 'open', giftId: g.id })}
                        aria-label={`Open mystery gift ${i + 1}`}
                        className={`rounded-2xl p-1 transition-transform ${
                          pickable ? 'cursor-pointer bg-tusk/15 ring-[3px] ring-loot hover:-translate-y-1' : 'cursor-default'
                        }`}
                      >
                        <GiftBox seed={g.wrap} size={84} className={i % 2 ? 'rotate-3' : '-rotate-3'} />
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Opened gifts */}
            {opened.length > 0 && (
              <section className="mt-5">
                <h2 className="mb-3 text-base font-extrabold text-tusk/70">{opened.length} opened</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {opened.map((g) => {
                    const canSteal = myTurn && picking === 'steal' && targets.some((t) => t.id === g.id)
                    return (
                      <div
                        key={g.id}
                        className={`${s.newest === g.id && g.steals === 0 ? 'pf-reveal' : ''} flex min-w-0 items-center gap-3 rounded-2xl border-[3px] border-ink bg-tusk p-3 text-ink ${
                          g.holder === YOU ? 'shadow-[5px_5px_0_0_var(--pf-mint)]' : ''
                        } ${canSteal ? 'ring-[3px] ring-redhanded' : ''}`}
                      >
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[2.5px] border-ink bg-white">
                          <Image src={g.src} alt="" width={160} height={160} className="h-[88%] w-[88%] object-contain" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-extrabold leading-tight">{g.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-ink/65">
                            <Avatar name={nameOf(s, g.holder ?? '')} size={20} />
                            {g.holder === YOU ? 'You' : nameOf(s, g.holder ?? '')}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className={`h-2.5 w-2.5 rounded-full border-[1.5px] border-ink ${
                                  i < g.steals ? 'bg-redhanded' : 'bg-white'
                                }`}
                              />
                            ))}
                            {g.locked && <span className="pf-chip ml-1 !bg-loot !py-0 !text-xs">Locked</span>}
                          </div>
                        </div>
                        {canSteal && (
                          <button onClick={() => act({ type: 'steal', giftId: g.id })} className="pf-btn pf-btn-sm pf-btn-red shrink-0">
                            Steal
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* What just happened */}
            {s.feed.length > 0 && s.phase === 'playing' && (
              <ul className="mt-5 space-y-1.5" aria-label="Game feed">
                {s.feed.map((f, i) => (
                  <li
                    key={f.id}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold ${i === 0 ? 'pf-pop' : 'opacity-60'} ${
                      f.tone === 'steal'
                        ? 'border-redhanded/70 bg-redhanded/25'
                        : f.tone === 'lock'
                          ? 'border-loot/70 bg-loot/20'
                          : 'border-mint/50 bg-mint/15'
                    }`}
                  >
                    {f.text}
                  </li>
                ))}
              </ul>
            )}

          </>
        )}
      </main>

      {/* The card every screen gets on a steal or a lock */}
      {s.shout && (
        <div className="pf-pop pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/50" role="status">
          <Announcement kind={s.shout.kind} text={s.shout.text} />
        </div>
      )}
    </PageShell>
  )
}
