import { createClient } from '@/lib/supabase'

export function subscribeToGame(
  gameId: string,
  handlers: {
    onGameChange: (payload: any) => void
    onPlayerChange: (payload: any) => void
    onGiftChange: (payload: any) => void
    onFeedEvent: (payload: any) => void
    onTradeChange: (payload: any) => void
  }
): () => void {
  const supabase = createClient()

  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'party_games', filter: `id=eq.${gameId}` },
      handlers.onGameChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      handlers.onPlayerChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'gifts', filter: `game_id=eq.${gameId}` },
      handlers.onGiftChange
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feed_events', filter: `game_id=eq.${gameId}` },
      handlers.onFeedEvent
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trades', filter: `game_id=eq.${gameId}` },
      handlers.onTradeChange
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
