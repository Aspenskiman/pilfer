-- ============================================================
-- Migration 004 — Launch hardening
-- Run ONCE in the Supabase SQL editor, BEFORE deploying the launch branch.
-- Safe to re-run. Supersedes supabase/functions/game_logic.sql.
--
-- What it does
--   1. Adds missing columns (plan, recap_unlocked, session_token, ...)
--   2. Turns RLS on for every table and rebuilds every policy
--   3. Removes all direct client writes — clients can only read;
--      every write goes through a checked function or a server route
--   4. Hides gifts.delivery_info and players.session_token from clients
--   5. Replaces the game functions with versions that verify identity
-- ============================================================

begin;

-- ── 1. Columns ──────────────────────────────────────────────
alter table public.party_games add column if not exists game_type text not null default 'pilfer';
alter table public.party_games add column if not exists plan text not null default 'free';
alter table public.party_games add column if not exists recap_unlocked boolean not null default false;
alter table public.party_games add column if not exists current_turn_player_id uuid references public.players(id);
alter table public.party_games add column if not exists round_number int;
alter table public.party_games add column if not exists last_stolen_from_id uuid references public.players(id);
alter table public.party_games add column if not exists last_stealer_id uuid references public.players(id);

alter table public.players add column if not exists role text not null default 'participant';
alter table public.players add column if not exists last_seen_at timestamptz;
alter table public.players add column if not exists host_acting boolean not null default false;
alter table public.players add column if not exists session_token text;

alter table public.gifts alter column delivery_info drop not null;

-- One game per Stripe payment (stops duplicate games on webhook retries).
-- If this fails, you have duplicate stripe_payment_id rows from testing — delete them and re-run.
create unique index if not exists party_games_stripe_payment_id_key
  on public.party_games (stripe_payment_id) where stripe_payment_id is not null;

create index if not exists players_game_id_idx on public.players (game_id);
create index if not exists gifts_game_id_idx on public.gifts (game_id);
create index if not exists feed_events_game_id_idx on public.feed_events (game_id, created_at);
create index if not exists actions_game_id_idx on public.actions (game_id, created_at);

-- ── 2. RLS on, old policies out ─────────────────────────────
alter table public.hosts        enable row level security;
alter table public.party_games  enable row level security;
alter table public.players      enable row level security;
alter table public.gifts        enable row level security;
alter table public.actions      enable row level security;
alter table public.feed_events  enable row level security;
alter table public.trades       enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('party_games','players','gifts','actions','feed_events','trades')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ── 3. Read-only policies ───────────────────────────────────
create policy "Host reads own games" on public.party_games
  for select using (auth.uid() = host_id);
create policy "Anyone reads open games" on public.party_games
  for select using (status in ('invited', 'active', 'complete'));

create policy "Players readable in open games" on public.players
  for select using (exists (
    select 1 from public.party_games g
    where g.id = players.game_id
      and (g.status in ('invited', 'active', 'complete') or g.host_id = auth.uid())
  ));

create policy "Gifts readable in open games" on public.gifts
  for select using (exists (
    select 1 from public.party_games g
    where g.id = gifts.game_id
      and (g.status in ('invited', 'active', 'complete') or g.host_id = auth.uid())
  ));

create policy "Actions readable in open games" on public.actions
  for select using (exists (
    select 1 from public.party_games g
    where g.id = actions.game_id and g.status in ('active', 'complete')
  ));

create policy "Feed readable in open games" on public.feed_events
  for select using (exists (
    select 1 from public.party_games g
    where g.id = feed_events.game_id and g.status in ('invited', 'active', 'complete')
  ));

create policy "Trades readable in active games" on public.trades
  for select using (exists (
    select 1 from public.party_games g
    where g.id = trades.game_id and g.status = 'active'
  ));

-- ── 4. Privileges: no client writes, private columns hidden ──
revoke insert, update, delete, truncate on
  public.party_games, public.players, public.gifts,
  public.actions, public.feed_events, public.trades
  from anon, authenticated;

revoke select on public.players from anon, authenticated;
grant select (id, game_id, display_name, turn_order, turn_taken, is_active,
              role, last_seen_at, host_acting, joined_at)
  on public.players to anon, authenticated;

revoke select on public.gifts from anon, authenticated;
grant select (id, game_id, submitted_by, image_url, gift_name, description,
              current_holder, steal_count, is_locked, is_opened, created_at)
  on public.gifts to anon, authenticated;

-- ── 5. Functions ────────────────────────────────────────────
drop function if exists public.pilfer_open_gift(uuid, uuid, uuid);
drop function if exists public.pilfer_steal_gift(uuid, uuid, uuid);

-- Is the caller allowed to act as this player?
-- Yes if they are the game's host, or they hold the player's session token.
create or replace function public.pilfer_can_act(
  p_game_id uuid, p_host_id uuid, p_player_id uuid, p_session_token text
) returns boolean
language sql stable security definer set search_path = public as $$
  select
    (auth.uid() is not null and auth.uid() = p_host_id)
    or exists (
      select 1 from public.players
      where id = p_player_id
        and game_id = p_game_id
        and p_session_token is not null
        and session_token = p_session_token
    );
$$;

-- Join a game. Enforces the paid player cap on the server.
create or replace function public.pilfer_join_game(
  p_game_id uuid, p_display_name text, p_role text default 'participant'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game   public.party_games%rowtype;
  v_name   text := btrim(coalesce(p_display_name, ''));
  v_role   text := coalesce(p_role, 'participant');
  v_count  int;
  v_token  text := gen_random_uuid()::text;
  v_id     uuid;
begin
  select * into v_game from public.party_games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Game not found');
  end if;

  if v_game.status = 'active' then
    v_role := 'spectator';
  elsif v_game.status <> 'invited' then
    return jsonb_build_object('success', false, 'error', 'This game is not open for joining');
  end if;

  if v_role not in ('participant', 'spectator') then
    v_role := 'participant';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    return jsonb_build_object('success', false, 'error', 'Name must be 1 to 30 characters');
  end if;

  if v_role = 'participant' then
    select count(*) into v_count from public.players
    where game_id = p_game_id and role = 'participant';
    if v_count >= coalesce(v_game.player_limit, 10) then
      return jsonb_build_object('success', false, 'error', 'full');
    end if;
  else
    select count(*) into v_count from public.players
    where game_id = p_game_id and role = 'spectator';
    if v_count >= 200 then
      return jsonb_build_object('success', false, 'error', 'This game has reached its spectator limit');
    end if;
  end if;

  insert into public.players (game_id, display_name, role, is_active, session_token)
  values (p_game_id, v_name, v_role, true, v_token)
  returning id into v_id;

  return jsonb_build_object('success', true, 'player_id', v_id, 'session_token', v_token, 'role', v_role);
end;
$$;

-- Submit a gift. One per player, only while the game is open for joining.
create or replace function public.pilfer_submit_gift(
  p_game_id uuid, p_player_id uuid, p_session_token text,
  p_gift_name text, p_description text, p_delivery_info text, p_image_url text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game   public.party_games%rowtype;
  v_player public.players%rowtype;
  v_name   text := btrim(coalesce(p_gift_name, ''));
  v_id     uuid;
begin
  select * into v_game from public.party_games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Game not found');
  end if;
  if v_game.status <> 'invited' then
    return jsonb_build_object('success', false, 'error', 'Gifts can only be added before the game starts');
  end if;
  if not public.pilfer_can_act(p_game_id, v_game.host_id, p_player_id, p_session_token) then
    return jsonb_build_object('success', false, 'error', 'Please rejoin the game from your invite link');
  end if;

  select * into v_player from public.players where id = p_player_id and game_id = p_game_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Player not found');
  end if;
  if exists (select 1 from public.gifts where game_id = p_game_id and submitted_by = p_player_id) then
    return jsonb_build_object('success', false, 'error', 'You have already submitted a gift');
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return jsonb_build_object('success', false, 'error', 'Gift name must be 1 to 40 characters');
  end if;
  if char_length(coalesce(p_description, '')) > 200 or char_length(coalesce(p_delivery_info, '')) > 300 then
    return jsonb_build_object('success', false, 'error', 'Description or delivery info is too long');
  end if;
  if p_image_url is null or p_image_url !~ '^https://' or char_length(p_image_url) > 500 then
    return jsonb_build_object('success', false, 'error', 'A gift photo is required');
  end if;

  -- Submitting a gift makes you a participant (if there is room).
  if v_player.role <> 'participant' then
    if (select count(*) from public.players where game_id = p_game_id and role = 'participant')
       >= coalesce(v_game.player_limit, 10) then
      return jsonb_build_object('success', false, 'error', 'This game is full for gift givers');
    end if;
    update public.players set role = 'participant' where id = p_player_id;
  end if;

  insert into public.gifts (game_id, submitted_by, gift_name, description, delivery_info, image_url)
  values (p_game_id, p_player_id, v_name, nullif(btrim(coalesce(p_description, '')), ''),
          nullif(btrim(coalesce(p_delivery_info, '')), ''), p_image_url)
  returning id into v_id;

  return jsonb_build_object('success', true, 'gift_id', v_id);
end;
$$;

-- Start the game. Host only. Players without a gift become spectators.
create or replace function public.pilfer_start_game(p_game_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game  public.party_games%rowtype;
  v_count int;
  v_first public.players%rowtype;
begin
  select * into v_game from public.party_games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Game not found');
  end if;
  if auth.uid() is null or auth.uid() <> v_game.host_id then
    return jsonb_build_object('success', false, 'error', 'Only the host can start the game');
  end if;
  if v_game.status <> 'invited' then
    return jsonb_build_object('success', false, 'error', 'This game cannot be started right now');
  end if;

  update public.players p set role = 'spectator'
  where p.game_id = p_game_id
    and p.role = 'participant'
    and not exists (select 1 from public.gifts g where g.game_id = p_game_id and g.submitted_by = p.id);

  select count(*) into v_count from public.players where game_id = p_game_id and role = 'participant';
  if v_count < 2 then
    -- undo nothing: roles revert naturally when a spectator submits a gift
    return jsonb_build_object('success', false, 'error', 'You need at least 2 players who have submitted a gift');
  end if;

  with ordered as (
    select id, row_number() over (order by random()) as rn
    from public.players where game_id = p_game_id and role = 'participant'
  )
  update public.players p
  set turn_order = o.rn, turn_taken = false
  from ordered o where p.id = o.id;

  update public.players set turn_order = null
  where game_id = p_game_id and role = 'spectator';

  select * into v_first from public.players
  where game_id = p_game_id and role = 'participant' order by turn_order asc limit 1;

  update public.party_games
  set status = 'active', current_turn_player_id = v_first.id, round_number = 1,
      last_stolen_from_id = null, last_stealer_id = null
  where id = p_game_id;

  insert into public.feed_events (game_id, event_type, content)
  values (p_game_id, 'narrative', 'The game has begun! ' || v_first.display_name || ' is up first.');

  return jsonb_build_object('success', true);
end;
$$;

-- Internal: move to the next player who has not had a turn, or finish the game.
create or replace function public.pilfer_advance_turn(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_next public.players%rowtype;
begin
  select * into v_next from public.players
  where game_id = p_game_id and role = 'participant' and turn_taken = false
  order by turn_order asc limit 1;

  if found then
    update public.party_games
    set current_turn_player_id = v_next.id, last_stolen_from_id = null, last_stealer_id = null
    where id = p_game_id;
  else
    update public.party_games
    set status = 'complete', current_turn_player_id = null,
        last_stolen_from_id = null, last_stealer_id = null
    where id = p_game_id;

    insert into public.feed_events (game_id, event_type, content)
    values (p_game_id, 'narrative', 'The game is over! Thanks for playing Pilfer!');
  end if;
end;
$$;

-- Open a wrapped gift on your turn.
create or replace function public.pilfer_open_gift(
  p_game_id uuid, p_player_id uuid, p_gift_id uuid, p_session_token text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game public.party_games%rowtype;
  v_gift public.gifts%rowtype;
  v_name text;
begin
  select * into v_game from public.party_games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Game not found');
  end if;
  if v_game.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Game is not active');
  end if;
  if not public.pilfer_can_act(p_game_id, v_game.host_id, p_player_id, p_session_token) then
    return jsonb_build_object('success', false, 'error', 'Please rejoin the game from your invite link');
  end if;
  if v_game.current_turn_player_id is distinct from p_player_id then
    return jsonb_build_object('success', false, 'error', 'It is not your turn');
  end if;

  select * into v_gift from public.gifts where id = p_gift_id and game_id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Gift not found');
  end if;
  if v_gift.is_opened then
    return jsonb_build_object('success', false, 'error', 'Gift is already opened');
  end if;

  select display_name into v_name from public.players where id = p_player_id;

  update public.gifts set is_opened = true, current_holder = p_player_id where id = p_gift_id;
  update public.players set turn_taken = true where id = p_player_id;

  insert into public.actions (game_id, actor_id, action_type, target_gift_id)
  values (p_game_id, p_player_id, 'open', p_gift_id);

  insert into public.feed_events (game_id, player_id, event_type, content)
  values (p_game_id, p_player_id, 'narrative', v_name || ' opened ' || v_gift.gift_name || '!');

  perform public.pilfer_advance_turn(p_game_id);
  return jsonb_build_object('success', true);
end;
$$;

-- Steal an opened, unlocked gift on your turn.
create or replace function public.pilfer_steal_gift(
  p_game_id uuid, p_actor_id uuid, p_gift_id uuid, p_session_token text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game            public.party_games%rowtype;
  v_gift            public.gifts%rowtype;
  v_previous_holder uuid;
  v_actor_name      text;
  v_previous_name   text;
  v_new_count       int;
  v_locked          boolean;
  v_last_gift       uuid;
begin
  select * into v_game from public.party_games where id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Game not found');
  end if;
  if v_game.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Game is not active');
  end if;
  if not public.pilfer_can_act(p_game_id, v_game.host_id, p_actor_id, p_session_token) then
    return jsonb_build_object('success', false, 'error', 'Please rejoin the game from your invite link');
  end if;
  if v_game.current_turn_player_id is distinct from p_actor_id then
    return jsonb_build_object('success', false, 'error', 'It is not your turn');
  end if;

  select * into v_gift from public.gifts where id = p_gift_id and game_id = p_game_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Gift not found');
  end if;
  if not v_gift.is_opened then
    return jsonb_build_object('success', false, 'error', 'Gift has not been opened yet');
  end if;
  if v_gift.is_locked then
    return jsonb_build_object('success', false, 'error', 'That gift is locked and cannot be stolen');
  end if;
  if v_gift.current_holder = p_actor_id then
    return jsonb_build_object('success', false, 'error', 'You cannot steal your own gift');
  end if;

  -- Cannot immediately steal back the gift that was just taken from you
  if p_actor_id = v_game.last_stolen_from_id then
    select target_gift_id into v_last_gift from public.actions
    where game_id = p_game_id and action_type = 'steal' and target_player_id = p_actor_id
    order by created_at desc limit 1;
    if p_gift_id = v_last_gift then
      return jsonb_build_object('success', false, 'error',
        'You cannot steal back the gift that was just taken from you');
    end if;
  end if;

  v_previous_holder := v_gift.current_holder;
  v_new_count       := coalesce(v_gift.steal_count, 0) + 1;
  v_locked          := v_new_count >= 3;

  select display_name into v_actor_name    from public.players where id = p_actor_id;
  select display_name into v_previous_name from public.players where id = v_previous_holder;

  update public.gifts
  set current_holder = p_actor_id, steal_count = v_new_count, is_locked = v_locked
  where id = p_gift_id;

  update public.players set turn_taken = true where id = p_actor_id;

  insert into public.actions (game_id, actor_id, action_type, target_gift_id, target_player_id)
  values (p_game_id, p_actor_id, 'steal', p_gift_id, v_previous_holder);

  insert into public.feed_events (game_id, player_id, event_type, content)
  values (p_game_id, p_actor_id, 'narrative',
          v_actor_name || ' stole ' || v_gift.gift_name || ' from ' || v_previous_name || '!');

  if v_locked then
    insert into public.feed_events (game_id, player_id, event_type, content)
    values (p_game_id, null, 'narrative',
            v_gift.gift_name || ' has been stolen 3 times — it is now locked forever!');
  end if;

  -- Revenge turn: the player who lost the gift goes next
  update public.party_games
  set current_turn_player_id = v_previous_holder,
      last_stolen_from_id    = v_previous_holder,
      last_stealer_id        = p_actor_id
  where id = p_game_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Emoji reactions and taunts. Narrative events can only come from the game functions.
create or replace function public.pilfer_react(
  p_game_id uuid, p_player_id uuid, p_session_token text, p_event_type text, p_content text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_game public.party_games%rowtype;
begin
  select * into v_game from public.party_games where id = p_game_id;
  if not found or v_game.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Game is not active');
  end if;
  if p_event_type not in ('reaction', 'taunt') then
    return jsonb_build_object('success', false, 'error', 'Invalid reaction');
  end if;
  if char_length(coalesce(p_content, '')) < 1 or char_length(p_content) > 80 then
    return jsonb_build_object('success', false, 'error', 'Invalid reaction');
  end if;
  if not public.pilfer_can_act(p_game_id, v_game.host_id, p_player_id, p_session_token) then
    return jsonb_build_object('success', false, 'error', 'Please rejoin the game from your invite link');
  end if;
  -- light rate limit: 1 per second per player
  if exists (
    select 1 from public.feed_events
    where game_id = p_game_id and player_id = p_player_id
      and event_type in ('reaction', 'taunt')
      and created_at > now() - interval '1 second'
  ) then
    return jsonb_build_object('success', true);
  end if;

  insert into public.feed_events (game_id, player_id, event_type, content)
  values (p_game_id, p_player_id, p_event_type, p_content);
  return jsonb_build_object('success', true);
end;
$$;

-- Private delivery info.
--   Host: every gift in their game.
--   Player: the gift they submitted, and (once the game is complete) the gift they won.
create or replace function public.pilfer_get_delivery(
  p_game_id uuid, p_player_id uuid default null, p_session_token text default null
) returns table (gift_id uuid, delivery_info text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_game public.party_games%rowtype;
begin
  select * into v_game from public.party_games where id = p_game_id;
  if not found then
    return;
  end if;

  if auth.uid() is not null and auth.uid() = v_game.host_id then
    return query select g.id, g.delivery_info from public.gifts g where g.game_id = p_game_id;
    return;
  end if;

  if p_player_id is null
     or not public.pilfer_can_act(p_game_id, null, p_player_id, p_session_token) then
    return;
  end if;

  return query
    select g.id, g.delivery_info from public.gifts g
    where g.game_id = p_game_id
      and (g.submitted_by = p_player_id
           or (v_game.status = 'complete' and g.current_holder = p_player_id));
end;
$$;

-- ── 6. Function privileges ──────────────────────────────────
revoke all on function public.pilfer_advance_turn(uuid) from public, anon, authenticated;
revoke all on function public.pilfer_can_act(uuid, uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.pilfer_join_game(uuid, text, text) to anon, authenticated;
grant execute on function public.pilfer_submit_gift(uuid, uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.pilfer_start_game(uuid) to authenticated;
grant execute on function public.pilfer_open_gift(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.pilfer_steal_gift(uuid, uuid, uuid, text) to anon, authenticated;
grant execute on function public.pilfer_react(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.pilfer_get_delivery(uuid, uuid, text) to anon, authenticated;
revoke execute on function public.pilfer_start_game(uuid) from public, anon;

commit;
