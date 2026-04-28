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

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game not found</h1>
          <p className="text-zinc-400">This join link isn&apos;t valid.</p>
        </div>
      </div>
    )
  }

  if (game.status === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game not open yet</h1>
          <p className="text-zinc-400">Ask your host to open the game for joining.</p>
        </div>
      </div>
    )
  }

  if (game.status === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">Game has ended</h1>
          <p className="text-zinc-400">This game is already over.</p>
        </div>
      </div>
    )
  }

  // status is 'invited' or 'active' — fetch participant count
  const { count: participantCount } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', game.id)
    .eq('role', 'participant')

  const forceSpectator = game.status === 'active'

  return (
    <NameForm
      game={game}
      participantCount={participantCount ?? 0}
      forceSpectator={forceSpectator}
    />
  )
}
