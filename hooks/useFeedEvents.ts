import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { FeedEvent } from '@/types'

export function useFeedEvents(gameId: string | null) {
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])

  useEffect(() => {
    if (!gameId) return

    const supabase = createClient()

    async function fetchFeedEvents() {
      const { data } = await supabase
        .from('feed_events')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
      if (data) setFeedEvents(data)
    }

    fetchFeedEvents()

    const channel = supabase
      .channel(`feed-events:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_events', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const event = payload.new as FeedEvent
          setFeedEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return feedEvents
}
