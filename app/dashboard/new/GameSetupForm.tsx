'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { THEMES, DEFAULT_THEME } from '@/constants/themes'
import { PageShell, TopBar } from '@/components/brand/Shell'

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

type Game = {
  id: string
  game_name: string | null
  join_code: string
  status: string
  game_date: string | null
  theme: string | null
  video_url: string | null
}

export default function GameSetupForm({ game }: { game: Game }) {
  const router = useRouter()
  const [gameName, setGameName] = useState(game.game_name ?? '')
  const [gameDate, setGameDate] = useState(game.game_date ? toDatetimeLocal(game.game_date) : '')
  const [theme, setTheme] = useState(
    THEMES.some((t) => t.id === game.theme) ? (game.theme as string) : DEFAULT_THEME
  )
  const [videoUrl, setVideoUrl] = useState(game.video_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/games/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: game.id,
        game_name: gameName,
        game_date: new Date(gameDate).toISOString(),
        theme,
        video_url: videoUrl.trim() || null,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      const errMsg = typeof data.error === 'string'
        ? data.error
        : 'Invalid form data. Please check your inputs.'
      setError(errMsg)
      return
    }

    router.push(`/dashboard/${game.id}`)
  }

  return (
    <PageShell>
      <TopBar href="/dashboard" maxWidth="max-w-2xl" />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6 sm:px-6">
        <h1 className="pf-display text-5xl text-tusk sm:text-6xl">You&apos;re booked</h1>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-lg text-tusk/70">
          Payment received. Your join code is
          <span className="pf-tag text-2xl">{game.join_code}</span>
        </p>

        <form onSubmit={handleSubmit} className="pf-paper mt-8 space-y-7 p-6 sm:p-8">
          <div>
            <label htmlFor="game_name" className="pf-label">
              Game name
            </label>
            <input
              id="game_name"
              type="text"
              required
              maxLength={60}
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="pf-input"
              placeholder="Office holiday party"
            />
          </div>

          <div>
            <label htmlFor="game_date" className="pf-label">
              Date and time
            </label>
            <input
              id="game_date"
              type="datetime-local"
              required
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="pf-input"
            />
          </div>

          <fieldset>
            <legend className="pf-label">Occasion</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={theme === t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-[2.5px] border-ink p-3 text-center transition-opacity ${
                    theme === t.id
                      ? 'bg-loot shadow-[0_3px_0_0_var(--pf-ink)]'
                      : 'bg-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">{t.emoji}</span>
                  <span className="text-xs font-bold leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="video_url" className="pf-label">
              Video call link <span className="pf-hint">(optional)</span>
            </label>
            <input
              id="video_url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="pf-input"
              placeholder="Paste your Zoom, Meet or Teams link"
            />
          </div>

          {error && (
            <p className="pf-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="pf-btn pf-btn-lg pf-btn-loot w-full">
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </main>
    </PageShell>
  )
}
