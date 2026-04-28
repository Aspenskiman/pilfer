'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  gameId: string
  joinCode: string
  status: string
}

export default function GameActions({ gameId, joinCode, status }: Props) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${joinCode}`
    : ''

  return (
    <div className="space-y-3">
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
