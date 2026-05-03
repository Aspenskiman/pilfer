'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

type GameCardProps = {
  id: string
  game_name: string | null
  join_code: string
  status: 'setup' | 'invited' | 'active' | 'complete'
  game_date: string | null
  playerCount: number
  giftedCount: number
  pendingCount: number
}

const JOIN_BASE = 'https://pilfer-lac.vercel.app/join'

function StatusPill({ status }: { status: GameCardProps['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/40 px-3 py-1 text-xs font-semibold text-green-400 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Live Now
      </span>
    )
  }
  if (status === 'invited') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-400 shrink-0">
        Open for Joining
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-white/50 shrink-0">
      Setting Up
    </span>
  )
}

export default function DashboardGameCard({
  id,
  game_name,
  join_code,
  status,
  game_date,
  playerCount,
  giftedCount,
  pendingCount,
}: GameCardProps) {
  const [copied, setCopied] = useState(false)
  const joinUrl = `${JOIN_BASE}/${join_code}`
  const showStats = status === 'invited' || status === 'active'
  const showQr = status === 'invited' || status === 'active'

  async function handleShare() {
    const shareData = {
      title: 'Join my Pilfer game!',
      text: `You're invited to ${game_name ?? 'Pilfer'}! Join code: ${join_code}`,
      url: joinUrl,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(shareData) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white/8 border border-white/15 rounded-2xl p-6 space-y-5">

      {/* Top row — name + status pill */}
      <div className="flex items-start justify-between gap-3">
        <h2
          className="text-xl font-bold text-white leading-tight"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {game_name ?? 'Untitled Game'}
        </h2>
        <StatusPill status={status} />
      </div>

      {/* Date row */}
      {game_date && (
        <p className="text-sm text-white/50">
          📅{' '}
          {new Date(game_date).toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      )}

      {/* Stats row */}
      {showStats && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/50">
          <span>👥 {playerCount} joined</span>
          <span className="text-white/20">·</span>
          <span>✅ {giftedCount} gifted up</span>
          <span className="text-white/20">·</span>
          <span>⏳ {pendingCount} still needed</span>
        </div>
      )}

      {/* QR code */}
      {showQr && (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <p className="text-xs text-white/30">Scan to join</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={handleShare}
          className="flex-1 min-h-10 rounded-xl bg-[#B8922A] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
        >
          {copied ? 'Link Copied!' : 'Share Invite'}
        </button>

        <Link
          href={`/dashboard/${id}`}
          className="flex-1 min-h-10 flex items-center justify-center rounded-xl border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/8 transition-colors"
        >
          Manage
        </Link>

        {status === 'invited' && (
          <Link
            href={`/game/${join_code}`}
            className="flex-1 min-h-10 flex items-center justify-center rounded-xl bg-[#B8922A] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            Go Live
          </Link>
        )}

        {status === 'active' && (
          <Link
            href={`/game/${join_code}/stage`}
            className="flex-1 min-h-10 flex items-center justify-center rounded-xl bg-[#B8922A] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            View Stage →
          </Link>
        )}
      </div>

    </div>
  )
}
