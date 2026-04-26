-- ============================================================
-- Pilfer — Game Logic Functions
-- Run in the Supabase SQL editor (in order)
-- Clients call these via supabase.rpc(); they never self-validate.
-- ============================================================


-- ── 3. pilfer_advance_turn ───────────────────────────────────
-- Defined first — called internally by pilfer_open_gift.
-- Returns VOID.

CREATE OR REPLACE FUNCTION public.pilfer_advance_turn(
  p_game_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game          public.party_games%ROWTYPE;
  v_current_order INT;
  v_next_player   public.players%ROWTYPE;
  v_wrapped_count INT;
BEGIN
  -- 1. Fetch current game row
  SELECT * INTO v_game
  FROM public.party_games
  WHERE id = p_game_id;

  -- 2. Get current player's turn_order
  SELECT turn_order INTO v_current_order
  FROM public.players
  WHERE id = v_game.current_turn_player_id;

  -- 3. Find next participant with a higher turn_order
  SELECT * INTO v_next_player
  FROM public.players
  WHERE game_id    = p_game_id
    AND role       = 'participant'
    AND turn_order > v_current_order
  ORDER BY turn_order ASC
  LIMIT 1;

  IF FOUND THEN
    -- 4. Advance to next player
    UPDATE public.party_games
    SET current_turn_player_id = v_next_player.id,
        last_stolen_from_id    = NULL
    WHERE id = p_game_id;

  ELSE
    -- 5. No next player — check for remaining wrapped gifts
    SELECT COUNT(*) INTO v_wrapped_count
    FROM public.gifts
    WHERE game_id   = p_game_id
      AND is_opened = FALSE;

    IF v_wrapped_count > 0 THEN
      -- Shouldn't happen — log as a feed event so host can see
      INSERT INTO public.feed_events (game_id, event_type, content)
      VALUES (
        p_game_id,
        'narrative',
        '[ERROR] Turn advance reached end of player list but wrapped gifts remain.'
      );

    ELSE
      -- No next player and no wrapped gifts — game over
      UPDATE public.party_games
      SET status                 = 'complete',
          current_turn_player_id = NULL,
          last_stolen_from_id    = NULL
      WHERE id = p_game_id;

      INSERT INTO public.feed_events (game_id, event_type, content)
      VALUES (
        p_game_id,
        'narrative',
        'The game is over! Thanks for playing Pilfer!'
      );
    END IF;
  END IF;
END;
$$;


-- ── 1. pilfer_open_gift ──────────────────────────────────────
-- Called by a player to open a wrapped gift on their turn.
-- Returns JSONB { success: boolean, error?: string }

CREATE OR REPLACE FUNCTION public.pilfer_open_gift(
  p_game_id   UUID,
  p_player_id UUID,
  p_gift_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game        public.party_games%ROWTYPE;
  v_gift        public.gifts%ROWTYPE;
  v_player_name TEXT;
BEGIN
  -- 1. Fetch game row
  SELECT * INTO v_game
  FROM public.party_games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  -- 2. Verify status = 'active'
  IF v_game.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not active');
  END IF;

  -- 3. Verify it is this player's turn
  IF v_game.current_turn_player_id IS DISTINCT FROM p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not your turn');
  END IF;

  -- 4. Fetch gift row
  SELECT * INTO v_gift
  FROM public.gifts
  WHERE id = p_gift_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;

  -- 5. Verify gift belongs to this game
  IF v_gift.game_id IS DISTINCT FROM p_game_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift does not belong to this game');
  END IF;

  -- 6. Verify gift is still wrapped
  IF v_gift.is_opened THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift is already opened');
  END IF;

  -- Resolve player display name for narrative
  SELECT display_name INTO v_player_name
  FROM public.players
  WHERE id = p_player_id;

  -- 7. Open the gift
  UPDATE public.gifts
  SET is_opened      = TRUE,
      current_holder = p_player_id
  WHERE id = p_gift_id;

  -- 8. Record action
  INSERT INTO public.actions (game_id, actor_id, action_type, target_gift_id)
  VALUES (p_game_id, p_player_id, 'open', p_gift_id);

  -- 9. Record feed event
  INSERT INTO public.feed_events (game_id, player_id, event_type, content)
  VALUES (p_game_id, p_player_id, 'narrative', v_player_name || ' opened a gift!');

  -- 10. Advance turn
  PERFORM public.pilfer_advance_turn(p_game_id);

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ── 2. pilfer_steal_gift ─────────────────────────────────────
-- Called by a player to steal an opened, unlocked gift on their turn.
-- Returns JSONB { success: boolean, error?: string }

CREATE OR REPLACE FUNCTION public.pilfer_steal_gift(
  p_game_id  UUID,
  p_actor_id UUID,
  p_gift_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game            public.party_games%ROWTYPE;
  v_gift            public.gifts%ROWTYPE;
  v_previous_holder UUID;
  v_actor_name      TEXT;
  v_previous_name   TEXT;
  v_new_steal_count INT;
  v_now_locked      BOOLEAN;
BEGIN
  -- 1. Fetch game row
  SELECT * INTO v_game
  FROM public.party_games
  WHERE id = p_game_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  -- 2. Verify status = 'active'
  IF v_game.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not active');
  END IF;

  -- 3. Verify it is this player's turn
  IF v_game.current_turn_player_id IS DISTINCT FROM p_actor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'It is not your turn');
  END IF;

  -- 4. Fetch gift row
  SELECT * INTO v_gift
  FROM public.gifts
  WHERE id = p_gift_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;

  -- 5a. Verify gift is opened
  IF NOT v_gift.is_opened THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift has not been opened yet');
  END IF;

  -- 5b. Verify gift is not locked
  IF v_gift.is_locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'That gift is locked and cannot be stolen');
  END IF;

  -- 5c. Verify player is not stealing their own gift
  IF v_gift.current_holder = p_actor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot steal your own gift');
  END IF;

  -- 6. Block: cannot steal back the specific gift just taken from you
  DECLARE
    v_last_stolen_gift_id UUID;
  BEGIN
    SELECT target_gift_id INTO v_last_stolen_gift_id
    FROM public.actions
    WHERE game_id          = p_game_id
      AND action_type      = 'steal'
      AND target_player_id = p_actor_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF p_actor_id = v_game.last_stolen_from_id
       AND p_gift_id = v_last_stolen_gift_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error',   'You cannot steal back the gift that was just taken from you'
      );
    END IF;
  END;

  -- Capture state before mutation
  v_previous_holder := v_gift.current_holder;
  v_new_steal_count := v_gift.steal_count + 1;
  v_now_locked      := v_new_steal_count >= 3;

  SELECT display_name INTO v_actor_name
  FROM public.players WHERE id = p_actor_id;

  SELECT display_name INTO v_previous_name
  FROM public.players WHERE id = v_previous_holder;

  -- 7. Update gift
  UPDATE public.gifts
  SET current_holder = p_actor_id,
      steal_count    = v_new_steal_count,
      is_locked      = v_now_locked
  WHERE id = p_gift_id;

  -- 8. Record action
  INSERT INTO public.actions
    (game_id, actor_id, action_type, target_gift_id, target_player_id)
  VALUES
    (p_game_id, p_actor_id, 'steal', p_gift_id, v_previous_holder);

  -- 9. Feed event — steal narrative
  INSERT INTO public.feed_events (game_id, player_id, event_type, content)
  VALUES (
    p_game_id,
    p_actor_id,
    'narrative',
    v_actor_name || ' stole ' || v_gift.gift_name || ' from ' || v_previous_name || '!'
  );

  -- 10. If now locked, add a second feed event
  IF v_now_locked THEN
    INSERT INTO public.feed_events (game_id, player_id, event_type, content)
    VALUES (
      p_game_id,
      NULL,
      'narrative',
      v_gift.gift_name || ' has been stolen 3 times — it is now locked forever!'
    );
  END IF;

  -- 11. Revenge turn — stolen-from player goes next
  UPDATE public.party_games
  SET current_turn_player_id = v_previous_holder,
      last_stolen_from_id    = v_previous_holder
  WHERE id = p_game_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- Permissions — allow authenticated and anonymous clients to
-- call these functions via supabase.rpc()
-- ============================================================
GRANT EXECUTE ON FUNCTION public.pilfer_open_gift(UUID, UUID, UUID)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.pilfer_steal_gift(UUID, UUID, UUID) TO authenticated, anon;
-- pilfer_advance_turn is internal only — no client grant
