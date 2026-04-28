import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import DashboardGameCard from './DashboardGameCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: games } = user
    ? await supabase
        .from('party_games')
        .select('id, game_name, join_code, status, game_date, created_at, recap_unlocked, player_limit')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const safeGames = games ?? []
  const gameIds = safeGames.map((g) => g.id)

  const [{ data: playerStats }, { data: giftStats }] = gameIds.length > 0
    ? await Promise.all([
        supabase.from('players').select('game_id, role').in('game_id', gameIds),
        supabase.from('gifts').select('game_id, submitted_by').in('game_id', gameIds),
      ])
    : [{ data: [] }, { data: [] }]

  function getStats(gameId: string) {
    const participants = (playerStats ?? []).filter(
      (p) => p.game_id === gameId && p.role === 'participant'
    )
    const playerCount = participants.length
    const giftedIds = new Set(
      (giftStats ?? []).filter((g) => g.game_id === gameId).map((g) => g.submitted_by)
    )
    const giftedCount = giftedIds.size
    const pendingCount = Math.max(0, playerCount - giftedCount)
    return { playerCount, giftedCount, pendingCount }
  }

  const upcomingGames = safeGames.filter((g) =>
    ['setup', 'invited', 'active'].includes(g.status)
  )
  const pastGames = safeGames.filter((g) => g.status === 'complete')

  return (
    <div className="min-h-screen bg-[#1A2B4A] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl font-bold text-white">My Games</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/40 hidden sm:block">{user?.email}</span>
            <Link
              href="/dashboard/new"
              className="rounded-xl bg-[#B8922A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              New Game
            </Link>
          </div>
        </div>

        {/* ── Upcoming Games ──────────────────────────────────── */}
        <section className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-4">
            Upcoming
          </p>

          {upcomingGames.length > 0 ? (
            <div className="space-y-4">
              {upcomingGames.map((game) => {
                const { playerCount, giftedCount, pendingCount } = getStats(game.id)
                return (
                  <DashboardGameCard
                    key={game.id}
                    id={game.id}
                    game_name={game.game_name}
                    join_code={game.join_code}
                    status={game.status as 'setup' | 'invited' | 'active' | 'complete'}
                    game_date={game.game_date}
                    playerCount={playerCount}
                    giftedCount={giftedCount}
                    pendingCount={pendingCount}
                  />
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/8 border border-white/15 p-10 text-center space-y-5">
              <p className="text-white/40">No upcoming games yet.</p>
              <Link
                href="/dashboard/new"
                className="inline-flex items-center justify-center min-h-12 px-8 rounded-xl bg-[#B8922A] text-white font-bold hover:opacity-90 transition-opacity"
              >
                Host a New Game
              </Link>
            </div>
          )}
        </section>

        {/* ── Past Games ──────────────────────────────────────── */}
        {pastGames.length > 0 && (
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#B8922A] mb-4">
              Past Games
            </p>
            <div className="space-y-2">
              {pastGames.map((game) => {
                const { playerCount } = getStats(game.id)
                return (
                  <Link
                    key={game.id}
                    href={`/game/${game.join_code}/recap`}
                    className="flex items-center justify-between rounded-xl bg-white/8 border border-white/10 px-4 py-3 hover:bg-white/12 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {game.game_name ?? 'Untitled'}
                      </p>
                      {game.game_date && (
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(game.game_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40 shrink-0">
                      <span>{playerCount} players</span>
                      <span>→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
