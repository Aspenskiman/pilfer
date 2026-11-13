export const MAX_STEAL_COUNT = 3
export const MAX_GIFT_NAME_LENGTH = 40
export const MAX_DISPLAY_NAME_LENGTH = 30
export const GAME_STATUSES = ['setup', 'invited', 'active', 'complete'] as const
export const LOCAL_STORAGE_PLAYER_KEY = 'pilfer_player_id'
export const LOCAL_STORAGE_TOKEN_KEY = 'pilfer_session_token'

// Explicit column lists: players.session_token and gifts.delivery_info are
// not readable by clients, so select('*') on these tables will fail.
export const PLAYER_COLUMNS =
  'id, game_id, display_name, turn_order, turn_taken, is_active, role, last_seen_at, host_acting, joined_at'
export const GIFT_COLUMNS =
  'id, game_id, submitted_by, image_url, gift_name, description, current_holder, steal_count, is_locked, is_opened, submitted_at'
