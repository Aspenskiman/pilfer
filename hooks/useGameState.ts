import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PartyGame } from '@/types'

export function useGameState(gameId: string | null) {
  const [game, setGame] = useState<PartyGame | null>(null)

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchGame() {
      const { data } = await supabase
        .from('party_games')
        .select('*')
        .eq('id', gameId)
        .single()
      if (data) setGame(data)
    }

    fetchGame()

    const channel = supabase
      .channel(`game-state:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_games', filter: `id=eq.${gameId}` },
        (payload) => { setGame(payload.new as PartyGame) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return game
}
