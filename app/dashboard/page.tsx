import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import DashboardGameCard from './DashboardGameCard'
import { PageShell, TopBar } from '@/components/brand/Shell'
import { GiftBox } from '@/components/brand/GiftBox'

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
    <PageShell>
      <TopBar href="/dashboard" maxWidth="max-w-3xl">
        <span className="hidden text-sm font-medium text-tusk/50 sm:block">{user?.email}</span>
        <Link href="/dashboard/new" className="pf-btn pf-btn-sm pf-btn-loot">
          New game
        </Link>
      </TopBar>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-6">
        <h1 className="pf-display text-5xl text-tusk sm:text-6xl">Your games</h1>

        {/* Upcoming */}
        <section className="mt-10">
          {upcomingGames.length > 0 ? (
            <div className="space-y-8">
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
            <div className="pf-paper flex flex-col items-center gap-5 px-6 py-10 text-center">
              <div className="flex items-end gap-1" aria-hidden="true">
                <GiftBox seed={1} size={56} className="-rotate-6" />
                <GiftBox seed={0} size={76} />
                <GiftBox seed={2} size={56} className="rotate-6" />
              </div>
              <div>
                <h2 className="pf-display text-3xl">No games on the calendar</h2>
                <p className="mt-2 text-ink/70">
                  Set one up in a couple of minutes, then send your guests one link.
                </p>
              </div>
              <Link href="/dashboard/new" className="pf-btn pf-btn-lg pf-btn-loot">
                Host a new game
              </Link>
            </div>
          )}
        </section>

        {/* Past games */}
        {pastGames.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-extrabold text-tusk">Past games</h2>
            <ul className="mt-4 space-y-3">
              {pastGames.map((game) => {
                const { playerCount } = getStats(game.id)
                return (
                  <li key={game.id}>
                    <Link
                      href={`/game/${game.join_code}/recap`}
                      className="pf-panel flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:border-loot"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-tusk">
                          {game.game_name ?? 'Untitled game'}
                        </p>
                        <p className="mt-0.5 text-sm text-tusk/55">
                          {game.game_date
                            ? new Date(game.game_date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'No date'}
                          , {playerCount} {playerCount === 1 ? 'player' : 'players'}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-loot">See the recap</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </main>
    </PageShell>
  )
}
