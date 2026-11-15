import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GameActions from './GameActions'
import { PageShell, TopBar } from '@/components/brand/Shell'

export default async function GamePage({
  params,
}: {
  params: Promise<{ game_id: string }>
}) {
  const { game_id } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('party_games')
    .select('id, game_name, join_code, status, game_date, theme')
    .eq('id', game_id)
    .single()

  if (!game) notFound()

  const statusLabel: Record<string, string> = {
    setup: 'Setting up',
    invited: 'Open for joining',
    active: 'Live now',
    complete: 'Finished',
  }
  const statusChip: Record<string, string> = {
    setup: 'pf-chip-quiet',
    invited: 'pf-chip-open',
    active: 'pf-chip-live',
    complete: 'pf-chip-quiet',
  }

  return (
    <PageShell>
      <TopBar href="/dashboard" maxWidth="max-w-2xl">
        <Link href="/dashboard" className="text-sm font-bold text-tusk/75 hover:text-tusk">
          Your games
        </Link>
      </TopBar>

      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6 sm:px-6">
        <span className={`pf-chip ${statusChip[game.status] ?? 'pf-chip-quiet'}`}>
          {statusLabel[game.status] ?? game.status}
        </span>
        <h1 className="pf-display mt-4 text-5xl text-tusk sm:text-6xl">{game.game_name}</h1>
        <p className="mt-5 flex flex-wrap items-center gap-3 text-lg text-tusk/70">
          Join code
          <span className="pf-tag text-3xl">{game.join_code}</span>
        </p>

        <div className="mt-8">
          <GameActions
            gameId={game.id}
            joinCode={game.join_code}
            status={game.status}
            gameName={game.game_name ?? ''}
            gameDate={game.game_date ?? null}
            theme={game.theme ?? 'winter'}
          />
        </div>
      </main>
    </PageShell>
  )
}
