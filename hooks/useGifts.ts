import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Gift } from '@/types'
import { GIFT_COLUMNS } from '@/constants/game'

export function useGifts(gameId: string | null) {
  const [gifts, setGifts] = useState<Gift[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchGifts() {
      const { data } = await supabase
        .from('gifts')
        .select(GIFT_COLUMNS)
        .eq('game_id', gameId)
      if (data) setGifts(data as unknown as Gift[])
    }

    fetchGifts()
    const poll = setInterval(fetchGifts, 5000)

    const channel = supabase
      .channel(`gifts:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gifts', filter: `game_id=eq.${gameId}` },
        () => { fetchGifts() }
      )
      .subscribe()

    return () => { clearInterval(poll); supabase.removeChannel(channel) }
  }, [gameId])

  return gifts
}
