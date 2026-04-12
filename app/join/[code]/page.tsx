import { createClient } from '@/lib/supabase-server'
import NameForm from './NameForm'

export default async function JoinCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('party_games')
    .select('id, game_name, join_code, status, player_limit')
    .eq('join_code', code.toUpperCase())
    .single()

  if (!game || game.status !== 'lobby') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game not found</h1>
          <p className="text-zinc-400">
            That join code doesn&apos;t match an active game.
          </p>
        </div>
      </div>
    )
  }

  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)
    .eq('is_active', true)

  if (game.player_limit && count !== null && count >= game.player_limit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game is full</h1>
          <p className="text-zinc-400">This game has reached its player limit.</p>
        </div>
      </div>
    )
  }

  return <NameForm game={game} />
}
