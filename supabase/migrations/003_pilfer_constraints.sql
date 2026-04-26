-- ============================================================
-- Migration 003 — DB-level input constraints
-- ============================================================

-- party_games
ALTER TABLE public.party_games
  ADD CONSTRAINT game_name_length CHECK (char_length(game_name) <= 60);

-- players
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS session_token TEXT,
  ADD CONSTRAINT display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 30);

-- gifts
ALTER TABLE public.gifts
  ADD CONSTRAINT gift_name_length CHECK (char_length(gift_name) BETWEEN 1 AND 40),
  ADD CONSTRAINT description_length CHECK (char_length(description) <= 200),
  ADD CONSTRAINT delivery_info_length CHECK (char_length(delivery_info) <= 300);
