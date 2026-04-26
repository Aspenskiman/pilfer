-- ============================================================
-- Migration 002 — Pilfer RLS policies
-- ============================================================

-- ── players — tighten existing loose policies ─────────────────
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;
DROP POLICY IF EXISTS "Anyone can join a game" ON public.players;
DROP POLICY IF EXISTS "Players can update own row" ON public.players;

CREATE POLICY "Players readable by game members"
  ON public.players FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status IN ('invited', 'active', 'complete')
    )
  );

CREATE POLICY "Players can join invited games"
  ON public.players FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'invited'
    )
  );

CREATE POLICY "Players can update own row"
  ON public.players FOR UPDATE
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status IN ('invited', 'active')
    )
  );

-- ── gifts — tighten existing loose policies ───────────────────
DROP POLICY IF EXISTS "Anyone can read gifts" ON public.gifts;
DROP POLICY IF EXISTS "Players can submit gifts" ON public.gifts;
DROP POLICY IF EXISTS "Service role can update gifts" ON public.gifts;

CREATE POLICY "Gifts readable by game members"
  ON public.gifts FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status IN ('invited', 'active', 'complete')
    )
  );

CREATE POLICY "Players can submit gifts to invited games"
  ON public.gifts FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'invited'
    )
  );

CREATE POLICY "Service role can update gifts"
  ON public.gifts FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── actions — enable RLS + policies ──────────────────────────
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Actions readable by game members"
  ON public.actions FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status IN ('active', 'complete')
    )
  );

CREATE POLICY "Service role can insert actions"
  ON public.actions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── feed_events — enable RLS + policies ──────────────────────
ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feed events readable by game members"
  ON public.feed_events FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status IN ('invited', 'active', 'complete')
    )
  );

CREATE POLICY "Players can insert feed events"
  ON public.feed_events FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'active'
    )
  );

-- ── trades — enable RLS + policies ───────────────────────────
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trades readable by game members"
  ON public.trades FOR SELECT
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'active'
    )
  );

CREATE POLICY "Players can propose trades"
  ON public.trades FOR INSERT
  WITH CHECK (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'active'
    )
  );

CREATE POLICY "Players can respond to trades"
  ON public.trades FOR UPDATE
  USING (
    game_id IN (
      SELECT id FROM public.party_games
      WHERE status = 'active'
    )
  );
