import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import GameActions from './GameActions'

export default async function GamePage({
  params,
}: {
  params: Promise<{ game_id: string }>
}) {
  const { game_id } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('party_games')
    .select('id, game_name, join_code, status, game_date')
    .eq('id', game_id)
    .single()

  if (!game) notFound()

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">Game lobby</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{game.game_name}</h1>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
          <div>
            <p className="text-sm text-zinc-400">Join code</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-widest text-white">
              {game.join_code}
            </p>
          </div>

          <div>
            <p className="text-sm text-zinc-400">Status</p>
            <span className="mt-1 inline-block rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-white capitalize">
              {game.status}
            </span>
          </div>

          {game.game_date && (
            <div>
              <p className="text-sm text-zinc-400">Scheduled for</p>
              <p className="mt-1 text-white">
                {new Date(game.game_date).toLocaleString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          )}
        </div>

        <GameActions
          gameId={game.id}
          joinCode={game.join_code}
          status={game.status}
        />
      </div>
    </div>
  )
}
