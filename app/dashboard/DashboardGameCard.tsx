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
      <span className="pf-chip pf-chip-live shrink-0">
        <span className="pf-pulse-ring h-2 w-2 rounded-full bg-ink" />
        Live now
      </span>
    )
  }
  if (status === 'invited') {
    return <span className="pf-chip pf-chip-open shrink-0">Open for joining</span>
  }
  return <span className="pf-chip pf-chip-paper-quiet shrink-0">Setting up</span>
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
    const formattedDate = game_date
      ? new Date(game_date).toLocaleString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'Date TBD'
    const shareUrl = `${window.location.origin}/join/${join_code}`
    const shareText = `You're invited to ${game_name ?? 'Pilfer'} on Pilfer! 🎁\n\n📅 ${formattedDate}\n🔑 Join code: ${join_code}\n\nTap the link to join — pick up your phone and scan the QR code when you arrive!`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${game_name ?? 'Pilfer'} on Pilfer!`,
          text: shareText,
          url: shareUrl,
        })
      } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const dateLabel = game_date
    ? new Date(game_date).toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'No date set'

  return (
    <article className="pf-paper flex flex-col overflow-hidden sm:flex-row">
      {/* Ticket body */}
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="pf-display text-3xl leading-none">{game_name ?? 'Untitled game'}</h2>
          <StatusPill status={status} />
        </div>

        <p className="font-semibold text-ink/70">{dateLabel}</p>

        {showStats && (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink/[0.06] px-2 py-3">
              <dd className="pf-display text-3xl">{playerCount}</dd>
              <dt className="mt-1 text-xs font-bold text-ink/60">joined</dt>
            </div>
            <div className="rounded-xl bg-ink/[0.06] px-2 py-3">
              <dd className="pf-display text-3xl">{giftedCount}</dd>
              <dt className="mt-1 text-xs font-bold text-ink/60">gifts in</dt>
            </div>
            <div className="rounded-xl bg-ink/[0.06] px-2 py-3">
              <dd className={`pf-display text-3xl ${pendingCount > 0 ? 'text-[#b3122b]' : ''}`}>
                {pendingCount}
              </dd>
              <dt className="mt-1 text-xs font-bold text-ink/60">gifts missing</dt>
            </div>
          </dl>
        )}

        <div className="mt-auto grid grid-cols-2 gap-3 pt-1">
          {status === 'invited' && (
            <Link href={`/game/${join_code}`} className="pf-btn pf-btn-loot col-span-2">
              Open the waiting room
            </Link>
          )}
          {status === 'active' && (
            <Link href={`/game/${join_code}/stage`} className="pf-btn pf-btn-red col-span-2">
              Go to the stage
            </Link>
          )}
          <button onClick={handleShare} className="pf-btn pf-btn-tusk">
            {copied ? 'Invite copied' : 'Share invite'}
          </button>
          <Link href={`/dashboard/${id}`} className="pf-btn pf-btn-plain">
            Manage
          </Link>
        </div>
      </div>

      {/* Ticket stub: how guests get in */}
      <div className="flex shrink-0 flex-row items-center justify-center gap-5 border-t-[3px] border-dashed border-ink/35 bg-white/60 p-5 sm:w-52 sm:flex-col sm:gap-3 sm:border-l-[3px] sm:border-t-0">
        {showQr ? (
          <>
            <div className="rounded-xl border-[3px] border-ink bg-white p-2">
              <QRCodeSVG value={joinUrl} size={120} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-ink/60">Scan, or use code</p>
              <p className="pf-display mt-1 text-2xl tracking-[0.14em]">{join_code}</p>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-xs font-bold text-ink/60">Join code</p>
            <p className="pf-display mt-1 text-2xl tracking-[0.14em]">{join_code}</p>
            <p className="mt-2 text-xs font-medium text-ink/60">
              Open the game for joining from Manage.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
