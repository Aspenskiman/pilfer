// Supabase table row types — single source of truth
// These mirror the database schema exactly.

export type Host = {
  id: string
  email: string
  created_at: string
}

export type PartyGame = {
  id: string
  host_id: string | null
  game_name: string | null
  game_date: string | null
  join_code: string
  status: 'setup' | 'invited' | 'active' | 'complete'
  theme: string | null
  video_url: string | null
  stripe_payment_id: string | null
  player_limit: number | null
  game_type: string
  current_turn_player_id: string | null
  round_number: number | null
  last_stolen_from_id: string | null
  last_stealer_id: string | null
  recap_unlocked: boolean
  created_at: string
}

export type Player = {
  id: string
  game_id: string
  display_name: string
  turn_order: number | null
  turn_taken: boolean
  is_active: boolean
  last_seen_at: string | null
  host_acting: boolean
  role: 'participant' | 'spectator'
  joined_at: string
}

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
  created_at: string
}

export type Action = {
  id: string
  game_id: string
  actor_id: string | null
  action_type: 'open' | 'steal' | 'trade' | 'lock'
  target_gift_id: string | null
  target_player_id: string | null
  created_at: string
}

export type FeedEvent = {
  id: string
  game_id: string
  player_id: string | null
  event_type: 'narrative' | 'reaction' | 'taunt'
  content: string | null
  created_at: string
}

export type Trade = {
  id: string
  game_id: string
  proposer_id: string | null
  receiver_id: string | null
  proposer_turn: number | null
  receiver_turn: number | null
  parent_trade_id: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}

// UI / derived types

export type GameStatus = PartyGame['status']

export type Tier = {
  id: string
  label: string
  players: string
  playerLimit: number | null
  price: string
  priceInCents: number | null
  cta: string
  highlight: boolean
}

export type Theme = {
  id: string
  label: string
  emoji: string
}
