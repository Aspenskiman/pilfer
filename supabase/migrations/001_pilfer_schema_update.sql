-- ============================================================
-- Migration 001 — Pilfer schema update
-- Brings the live database in line with supabase/schema.sql
-- Run once in the Supabase SQL editor
-- ============================================================


-- ── a. Rename status values on existing rows ─────────────────
UPDATE public.party_games SET status = 'setup'    WHERE status = 'draft';
UPDATE public.party_games SET status = 'invited'  WHERE status = 'lobby';
UPDATE public.party_games SET status = 'complete' WHERE status = 'completed';


-- ── b. Add missing columns to party_games ────────────────────
ALTER TABLE public.party_games
  ADD COLUMN IF NOT EXISTS game_type               TEXT NOT NULL DEFAULT 'pilfer';

ALTER TABLE public.party_games
  ADD COLUMN IF NOT EXISTS current_turn_player_id  UUID REFERENCES public.players(id);

ALTER TABLE public.party_games
  ADD COLUMN IF NOT EXISTS round_number            INT;

ALTER TABLE public.party_games
  ADD COLUMN IF NOT EXISTS last_stolen_from_id     UUID REFERENCES public.players(id);


-- ── c. Add missing columns to players ────────────────────────
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant', 'spectator'));

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS host_acting BOOLEAN NOT NULL DEFAULT FALSE;


-- ── d. Create actions table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.actions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          UUID REFERENCES public.party_games(id) ON DELETE CASCADE,
  actor_id         UUID REFERENCES public.players(id),
  action_type      TEXT NOT NULL, -- open|steal|trade|lock
  target_gift_id   UUID REFERENCES public.gifts(id),
  target_player_id UUID REFERENCES public.players(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ── e. Create feed_events table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.feed_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID REFERENCES public.party_games(id) ON DELETE CASCADE,
  player_id    UUID REFERENCES public.players(id),
  event_type   TEXT NOT NULL, -- narrative|reaction|taunt
  content      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ── f. Create trades table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id         UUID REFERENCES public.party_games(id) ON DELETE CASCADE,
  proposer_id     UUID REFERENCES public.players(id),
  receiver_id     UUID REFERENCES public.players(id),
  proposer_turn   INT,
  receiver_turn   INT,
  parent_trade_id UUID REFERENCES public.trades(id),
  status          TEXT DEFAULT 'pending', -- pending|accepted|rejected
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ── g. Enable realtime on new tables ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.actions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'feed_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
  END IF;
END $$;


-- ── h. Update RLS policy on party_games ──────────────────────
-- Drop the old policy that referenced 'lobby'/'completed', recreate with new values.
DROP POLICY IF EXISTS "Anyone can read active games" ON public.party_games;

CREATE POLICY "Anyone can read active games"
  ON public.party_games FOR SELECT
  USING (status IN ('invited', 'active', 'complete'));
