'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const THEMES = [
  { id: 'winter_celebration', label: 'Winter Celebration', emoji: '❄️' },
  { id: 'birthday_bash',      label: 'Birthday Bash',      emoji: '🎂' },
  { id: 'shower_party',       label: 'Shower Party',       emoji: '🌸' },
  { id: 'team_mode',          label: 'Team Mode',          emoji: '👥' },
  { id: 'fall_gathering',     label: 'Fall Gathering',     emoji: '🍂' },
  { id: 'just_for_fun',       label: 'Just for Fun',       emoji: '🎉' },
  { id: 'summer_vibes',       label: 'Summer Vibes',       emoji: '☀️' },
  { id: 'celebration',        label: 'Celebration',        emoji: '🎊' },
]

type Game = {
  id: string
  game_name: string | null
  join_code: string
  status: string
}

export default function GameSetupForm({ game }: { game: Game }) {
  const router = useRouter()
  const [gameName, setGameName] = useState(game.game_name ?? '')
  const [gameDate, setGameDate] = useState('')
  const [theme, setTheme] = useState('winter_celebration')
  const [videoUrl, setVideoUrl] = useState('')
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
        game_date: gameDate,
        theme,
        video_url: videoUrl || null,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      return
    }

    router.push(`/dashboard/${game.id}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">Set up your game</h1>
          <p className="mt-2 text-zinc-400">
            Join code: <span className="font-mono font-semibold text-white">{game.join_code}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Game name */}
          <div className="space-y-1">
            <label htmlFor="game_name" className="block text-sm font-medium text-zinc-300">
              Game name <span className="text-zinc-500">(max 40 chars)</span>
            </label>
            <input
              id="game_name"
              type="text"
              required
              maxLength={40}
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="e.g. Sarah's Birthday Trivia"
            />
          </div>

          {/* Game date */}
          <div className="space-y-1">
            <label htmlFor="game_date" className="block text-sm font-medium text-zinc-300">
              Date &amp; time
            </label>
            <input
              id="game_date"
              type="datetime-local"
              required
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white focus:border-white focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* Theme selector */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-300">Theme</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition ${
                    theme === t.id
                      ? 'border-white bg-zinc-800'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-xs font-medium text-white leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Video call URL */}
          <div className="space-y-1">
            <label htmlFor="video_url" className="block text-sm font-medium text-zinc-300">
              Video call link <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id="video_url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-white focus:outline-none"
              placeholder="Paste your Zoom, Meet, or Teams link"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Create game'}
          </button>
        </form>
      </div>
    </div>
  )
}
