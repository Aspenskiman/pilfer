'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

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

export default function GameActions({ gameId, joinCode, status, gameName, gameDate, theme }: Props) {
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

    if (!res.ok) return

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
        game_name: gameName,
        game_date: new Date(newDate).toISOString(),
        theme,
      }),
    })

    setSavingDate(false)

    if (!res.ok) {
      const data = await res.json()
      setDateError(typeof data.error === 'string' ? data.error : 'Failed to save date.')
      return
    }

    setEditDateOpen(false)
    router.refresh()
  }

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${joinCode}`
    : ''

  return (
    <div className="space-y-3">

      {/* Edit Date */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Party date &amp; time</p>
          <button
            onClick={() => { setEditDateOpen((v) => !v); setDateError(null) }}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {editDateOpen ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editDateOpen ? (
          <div className="space-y-2">
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm focus:border-white focus:outline-none [color-scheme:dark]"
            />
            {dateError && <p className="text-xs text-red-400">{dateError}</p>}
            <button
              onClick={handleSaveDate}
              disabled={savingDate}
              className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {savingDate ? 'Saving…' : 'Save Date'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            {gameDate
              ? new Date(gameDate).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              : 'No date set'}
          </p>
        )}
      </div>

      {/* QR code */}
      {(status === 'invited' || status === 'active') && joinUrl && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <QRCodeSVG value={joinUrl} size={180} />
          <p className="text-sm text-zinc-400">Scan to join</p>
        </div>
      )}

      {status === 'setup' && (
        <button
          onClick={handleOpen}
          disabled={opening || openSuccess}
          className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {openSuccess ? 'Game opened! Refreshing…' : opening ? 'Opening…' : 'Open for Joining'}
        </button>
      )}
      <button
        onClick={handleCopyLink}
        className="w-full rounded-lg border border-zinc-700 px-4 py-3 font-semibold text-white transition hover:bg-zinc-800"
      >
        {copied ? 'Copied!' : 'Copy Join Link'}
      </button>
    </div>
  )
}
