import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Player } from '@/types'
import { PLAYER_COLUMNS } from '@/constants/game'

export function usePlayers(gameId: string | null) {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchPlayers() {
      const { data } = await supabase
        .from('players')
        .select(PLAYER_COLUMNS)
        .eq('game_id', gameId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
      if (data) setPlayers(data as unknown as Player[])
    }

    fetchPlayers()
    // Safety net: if a realtime message is missed (flaky wifi, sleeping phone),
    // the screen still catches up within a few seconds.
    const poll = setInterval(fetchPlayers, 5000)

    const channel = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => { fetchPlayers() }
      )
      .subscribe()

    return () => { clearInterval(poll); supabase.removeChannel(channel) }
  }, [gameId])

  return players
}
