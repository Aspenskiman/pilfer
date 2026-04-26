import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Trade } from '@/types'

export function useTrades(gameId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchTrades() {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('game_id', gameId)
      setTrades(data ?? [])
    }

    fetchTrades()

    const channel = supabase
      .channel(`trades:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `game_id=eq.${gameId}` },
        () => { fetchTrades() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return trades
}
