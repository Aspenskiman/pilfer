import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { StatusScreen } from '@/components/brand/Shell'
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
      <StatusScreen
        title="Game not found"
        action={
          <Link href="/join" className="pf-btn pf-btn-loot">
            Enter a different code
          </Link>
        }
      >
        <p>This join link isn&apos;t valid. Check the code with your host.</p>
      </StatusScreen>
    )
  }

  if (game.status === 'setup') {
    return (
      <StatusScreen title="Not open yet">
        <p>Ask your host to open the game for joining, then reload this page.</p>
      </StatusScreen>
    )
  }

  if (game.status === 'complete') {
    return (
      <StatusScreen title="This game has ended">
        <p>The gifts have all found a home.</p>
      </StatusScreen>
    )
  }

  // status is 'invited' or 'active' — fetch participant count
  const { count: participantCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
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
