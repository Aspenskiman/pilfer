import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Player = {
  id: string
  display_name: string
  turn_order: number | null
  turn_taken: boolean
  is_active: boolean
  joined_at: string
}

export function usePlayers(gameId: string | null) {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchPlayers() {
      const { data } = await supabase
        .from('players')
        .select('id, display_name, turn_order, turn_taken, is_active, joined_at')
        .eq('game_id', gameId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
      setPlayers(data ?? [])
    }

    fetchPlayers()

    const channel = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        () => { fetchPlayers() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return players
}
