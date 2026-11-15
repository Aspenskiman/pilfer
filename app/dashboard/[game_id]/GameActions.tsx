'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { track } from '@/lib/analytics'

type Props = {
  gameId: string
  joinCode: string
  status: string
  gameName: string
  gameDate: string | null
  theme: string
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export default function GameActions({ gameId, joinCode, status, gameDate }: Props) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editDateOpen, setEditDateOpen] = useState(false)
  const [newDate, setNewDate] = useState(gameDate ? toDatetimeLocal(gameDate) : '')
  const [savingDate, setSavingDate] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  async function handleOpen() {
    setOpening(true)
    const res = await fetch('/api/games/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId }),
    })
    setOpening(false)

    if (!res.ok) {
      setDateError('Could not open the game. Please try again.')
      return
    }

    track('game_opened_for_joining')
    setOpenSuccess(true)
    setTimeout(() => router.refresh(), 1000)
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${joinCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSaveDate() {
    if (!newDate) {
      setDateError('Please select a date and time.')
      return
    }
    setSavingDate(true)
    setDateError(null)

    const res = await fetch('/api/games/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        game_date: new Date(newDate).toISOString(),
      }),
    })

    setSavingDate(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setDateError(typeof data.error === 'string' ? data.error : 'Failed to save date.')
      return
    }

    setEditDateOpen(false)
    router.refresh()
  }

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${joinCode}`
    : ''

  const dateLabel = gameDate
    ? new Date(gameDate).toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'No date set'

  return (
    <div className="space-y-6">
      {/* Open for joining: the one thing to do while the game is still being set up */}
      {status === 'setup' && (
        <div className="pf-paper p-6 sm:p-8">
          <h2 className="pf-display text-3xl">Ready for guests?</h2>
          <p className="mt-2 text-ink/70">
            Open the game and your join link and QR code start working. Guests can then join and
            add their gifts any time before the party.
          </p>
          <button
            onClick={handleOpen}
            disabled={opening || openSuccess}
            className="pf-btn pf-btn-lg pf-btn-loot mt-5 w-full"
          >
            {openSuccess ? 'Opened. One moment…' : opening ? 'Opening…' : 'Open for joining'}
          </button>
          {dateError && !editDateOpen && (
            <p className="pf-error mt-3" role="alert">
              {dateError}
            </p>
          )}
        </div>
      )}

      {/* Invite: QR, what happens next, and the way into the waiting room */}
      {(status === 'invited' || status === 'active') && joinUrl && (
        <div className="pf-paper overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-2xl border-[3px] border-ink bg-white p-3">
                <QRCodeSVG value={joinUrl} size={168} />
              </div>
              <p className="text-sm font-bold text-ink/60">Guests scan to join</p>
            </div>

            <div className="flex flex-col">
              <h2 className="pf-display text-3xl">
                {status === 'active' ? 'The game is live' : 'Get everyone in'}
              </h2>
              {status === 'invited' && (
                <ol className="mt-3 list-decimal space-y-2 pl-5 font-medium text-ink/80">
                  <li>Send the join link to your guests. Each one enters a name and adds a gift.</li>
                  <li>Join from your own phone too if you are playing.</li>
                  <li>Open the waiting room to watch people arrive, then start the game.</li>
                </ol>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:mt-auto sm:flex-row sm:pt-6">
                <a
                  href={`/game/${joinCode}`}
                  className={`pf-btn flex-1 ${status === 'active' ? 'pf-btn-red' : 'pf-btn-loot'}`}
                >
                  {status === 'active' ? 'Go to the game' : 'Open the waiting room'}
                </a>
                <button onClick={handleCopyLink} className="pf-btn pf-btn-tusk flex-1">
                  {copied ? 'Link copied' : 'Copy join link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party date */}
      <div className="pf-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-tusk/60">Party date and time</p>
            {!editDateOpen && <p className="mt-1 text-lg font-bold text-tusk">{dateLabel}</p>}
          </div>
          <button
            onClick={() => { setEditDateOpen((v) => !v); setDateError(null) }}
            className="pf-btn pf-btn-sm pf-btn-ghost"
          >
            {editDateOpen ? 'Cancel' : 'Change'}
          </button>
        </div>

        {editDateOpen && (
          <div className="mt-3 space-y-3">
            <input
              type="datetime-local"
              aria-label="Party date and time"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="pf-input"
            />
            {dateError && (
              <p className="pf-error-dark" role="alert">
                {dateError}
              </p>
            )}
            <button onClick={handleSaveDate} disabled={savingDate} className="pf-btn pf-btn-loot w-full">
              {savingDate ? 'Saving…' : 'Save date'}
            </button>
          </div>
        )}
      </div>

      {status === 'setup' && (
        <button onClick={handleCopyLink} className="pf-btn pf-btn-ghost w-full">
          {copied ? 'Link copied' : 'Copy join link'}
        </button>
      )}
    </div>
  )
}
