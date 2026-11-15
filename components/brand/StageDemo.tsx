'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { GiftBox } from './GiftBox'

/**
 * A looping, scripted round of Pilfer shown on the landing page: the shared
 * stage screen with one player's phone in front of it. Nothing here talks to
 * the database. It exists so a host can see the party before signing up.
 *
 * Every size inside is a multiple of --u (the frame's width / 560), so the
 * whole scene scales with its container. Styles live in globals.css (.pfd-*).
 */

type Beat = 0 | 1 | 2 | 3

// How long each beat stays on screen, in ms.
const HOLD: Record<Beat, number> = { 0: 2400, 1: 2600, 2: 3200, 3: 3400 }

const PLAYERS = {
  maya: { name: 'Maya', color: '#f5b841' },
  dan: { name: 'Dan', color: '#4fe0b5' },
  jo: { name: 'Jo', color: '#8b7bff' },
  priya: { name: 'Priya', color: '#ff9a5a' },
  sam: { name: 'Sam', color: '#ff4f64' },
} as const
type PlayerId = keyof typeof PLAYERS

type DemoGift = {
  id: string
  art: string
  name: string
  tile: string
  holder: PlayerId
  steals: number
  locked?: boolean
  hot?: boolean
}

function giftsAt(beat: Beat): DemoGift[] {
  const gifts: DemoGift[] = [
    { id: 'fryer', art: 'fryer', name: 'Air fryer', tile: '#ffd9a8', holder: 'jo', steals: 1 },
    { id: 'slippers', art: 'slippers', name: 'Llama slippers', tile: '#cdebe0', holder: 'priya', steals: 0 },
    {
      id: 'sauce',
      art: 'sauce',
      name: 'Hot sauce set',
      tile: '#ffc9cf',
      holder: beat === 3 ? 'maya' : 'sam',
      steals: beat === 3 ? 3 : 2,
      locked: beat === 3,
      hot: beat === 3,
    },
  ]
  if (beat >= 1) {
    gifts.push({
      id: 'mic',
      art: 'mic',
      name: 'Karaoke mic',
      tile: '#d9d3ff',
      holder: beat === 1 ? 'maya' : 'dan',
      steals: beat === 1 ? 0 : 1,
      hot: beat === 2,
    })
  }
  return gifts
}

const UP_NOW: Record<Beat, PlayerId> = { 0: 'maya', 1: 'maya', 2: 'dan', 3: 'maya' }
const ON_DECK: Record<Beat, string> = { 0: 'Dan', 1: 'Dan', 2: 'Priya', 3: 'Priya' }
const FEED: Record<Beat, { text: string; tone: 'quiet' | 'open' | 'steal' | 'lock' }> = {
  0: { text: 'Maya is up. Open or steal?', tone: 'quiet' },
  1: { text: 'Maya opened a karaoke mic', tone: 'open' },
  2: { text: 'Dan stole the karaoke mic from Maya', tone: 'steal' },
  3: { text: 'Hot sauce set is locked with Maya', tone: 'lock' },
}

function Face({ id, className = '' }: { id: PlayerId; className?: string }) {
  const p = PLAYERS[id]
  return (
    <span className={`pfd-face ${className}`} style={{ background: p.color }}>
      {p.name[0]}
    </span>
  )
}

/** A rendered demo prize from public/art. */
function Prize({ name }: { name: string }) {
  return <Image src={`/art/prize-${name}.webp`} alt="" width={120} height={120} className="pfd-prize" />
}

export function StageDemo() {
  // The first frame is the steal, so the page makes its point before anything moves.
  const [beat, setBeat] = useState<Beat>(2)

  // Advance the script. With reduced motion the scene holds on the steal.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setBeat((b) => ((b + 1) % 4) as Beat), HOLD[beat])
    return () => clearTimeout(t)
  }, [beat])

  const gifts = giftsAt(beat)
  const wrapped = beat === 0 ? [0, 1, 2, 3] : [1, 2, 3]
  const up = UP_NOW[beat]
  const feed = FEED[beat]

  return (
    <div
      className="pfd"
      role="img"
      aria-label="A round of Pilfer. On the shared screen, Maya opens a karaoke mic, Dan steals it from her, and Maya takes a hot sauce set on her revenge turn, which locks it. Her phone shows each moment as it happens."
    >
      <div className="pfd-root" aria-hidden="true">
        {/* The stage: what the room sees */}
        <div className="pfd-screen">
          <div className="pfd-bar">
            <div className="pfd-upnow">
              <Face id={up} className="pfd-face-lg" key={up} />
              <div>
                <div className="pfd-kicker">{beat === 3 ? 'Revenge turn' : 'Up now'}</div>
                <div className="pfd-name">{PLAYERS[up].name}</div>
              </div>
            </div>
            <div className="pfd-deck">
              <div className="pfd-kicker">On deck</div>
              <div className="pfd-deck-name">{ON_DECK[beat]}</div>
            </div>
          </div>

          <div className="pfd-body">
            <div className="pfd-label">{wrapped.length} still wrapped</div>
            <div className="pfd-wrapped">
              {wrapped.map((seed) => (
                <GiftBox key={seed} seed={seed} className={`pfd-box ${seed % 2 ? 'pfd-tilt-r' : 'pfd-tilt-l'}`} />
              ))}
            </div>

            <div className="pfd-label">{gifts.length} opened</div>
            <div className="pfd-cards">
              {gifts.map((g) => (
                <div
                  key={g.id}
                  className={`pfd-card ${g.hot ? (g.locked ? 'pfd-card-lock' : 'pfd-card-hot') : ''} ${
                    g.id === 'mic' && beat === 1 ? 'pfd-card-new' : ''
                  }`}
                >
                  <span className="pfd-tile" style={{ background: g.tile }}>
                    <Prize name={g.art} />
                  </span>
                  <span className="pfd-card-text">
                    <span className="pfd-card-name">{g.name}</span>
                    <span className="pfd-card-holder">
                      <Face id={g.holder} className="pfd-face-sm" />
                      {PLAYERS[g.holder].name}
                    </span>
                    <span className="pfd-dots">
                      {[0, 1, 2].map((i) => (
                        <i key={i} className={i < g.steals ? 'on' : ''} />
                      ))}
                      {g.locked && <b>Locked</b>}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <div className={`pfd-feed pfd-feed-${feed.tone}`} key={beat}>
              {feed.text}
            </div>
          </div>

          {/* The announcement every screen gets */}
          {(beat === 2 || beat === 3) && (
            <div className="pfd-shout-wrap" key={`shout-${beat}`}>
              <div className={`pfd-shout ${beat === 3 ? 'pfd-shout-lock' : ''}`}>
                <div className="pf-stripes pfd-shout-band" />
                <div className="pfd-shout-word">{beat === 2 ? 'Pilfer!' : 'Locked!'}</div>
                <div className="pfd-shout-text">
                  {beat === 2 ? 'Dan stole the karaoke mic from Maya' : 'Three steals. The hot sauce stays with Maya.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Maya's phone: what one player holds */}
        <div className="pfd-phone">
          <div className="pfd-notch" />
          <div className={`pfd-phone-screen pfd-phone-${beat}`} key={`phone-${beat}`}>
            {beat === 0 && (
              <>
                <Face id="maya" className="pfd-face-lg" />
                <div className="pfd-phone-title">Your turn, Maya</div>
                <div className="pfd-phone-btn pfd-phone-btn-loot">Open a gift</div>
                <div className="pfd-phone-btn pfd-phone-btn-red">Steal one</div>
              </>
            )}
            {beat === 1 && (
              <>
                <div className="pfd-phone-small">You opened</div>
                <span className="pfd-phone-tile" style={{ background: '#d9d3ff' }}>
                  <Prize name="mic" />
                </span>
                <div className="pfd-phone-title">Karaoke mic</div>
                <div className="pfd-phone-small">Guard it. Dan is up next.</div>
              </>
            )}
            {beat === 2 && (
              <>
                <div className="pfd-phone-title">Dan stole your mic</div>
                <div className="pfd-phone-small">You get a revenge turn.</div>
                <div className="pfd-phone-btn pfd-phone-btn-tusk">Open a gift</div>
                <div className="pfd-phone-btn pfd-phone-btn-ink">Steal one</div>
              </>
            )}
            {beat === 3 && (
              <>
                <span className="pfd-phone-tile" style={{ background: '#ffc9cf' }}>
                  <Prize name="sauce" />
                </span>
                <div className="pfd-phone-title">Locked. It&apos;s yours.</div>
                <div className="pfd-phone-small">Nobody can steal the hot sauce set now.</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
