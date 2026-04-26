import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Player } from '@/types'

export function usePlayers(gameId: string | null) {
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchPlayers() {
      const { data } = await supabase
        .from('players')
        .select('*')
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
