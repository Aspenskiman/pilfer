import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Game = {
  id: string
  game_name: string
  join_code: string
  status: string
  host_id: string | null
  player_limit: number | null
}

export function useGameState(gameId: string | null) {
  const [game, setGame] = useState<Game | null>(null)

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchGame() {
      const { data } = await supabase
        .from('party_games')
        .select('id, game_name, join_code, status, host_id, player_limit')
        .eq('id', gameId)
        .single()
      if (data) setGame(data)
    }

    fetchGame()

    const channel = supabase
      .channel(`game-state:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'party_games', filter: `id=eq.${gameId}` },
        (payload) => { setGame(payload.new as Game) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return game
}
