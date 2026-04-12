import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export type Gift = {
  id: string
  game_id: string
  submitted_by: string
  image_url: string
  gift_name: string
  description: string | null
  delivery_info: string
  current_holder: string | null
  steal_count: number
  is_locked: boolean
  is_opened: boolean
}

export function useGifts(gameId: string | null) {
  const [gifts, setGifts] = useState<Gift[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchGifts() {
      const { data } = await supabase
        .from('gifts')
        .select('*')
        .eq('game_id', gameId)
      setGifts(data ?? [])
    }

    fetchGifts()

    const channel = supabase
      .channel(`gifts:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gifts', filter: `game_id=eq.${gameId}` },
        () => { fetchGifts() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return gifts
}
