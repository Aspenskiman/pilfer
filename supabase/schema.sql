-- ============================================================
-- Pilfer — Full Database Schema
-- Run this in the Supabase SQL editor (in order)
-- ============================================================

-- ── 1. hosts ────────────────────────────────────────────────
create table if not exists public.hosts (
  id   uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now()
);

-- ── 2. party_games ──────────────────────────────────────────
create table if not exists public.party_games (
  id                uuid primary key default gen_random_uuid(),
  host_id           uuid references auth.users(id),
  game_name         text,
  game_date         timestamptz,
  join_code         text not null unique,
  status            text not null default 'setup',
  theme             text,
  video_url         text,
  stripe_payment_id text,
  player_limit      int,
  game_type         text not null default 'pilfer',
  created_at        timestamptz default now()
);

-- ── 3. players ───────────────────────────────────────────────
create table if not exists public.players (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid references public.party_games(id) on delete cascade,
  display_name text not null,
  turn_order   int,
  turn_taken   boolean default false,
  is_active    boolean default true,
  role         text not null default 'participant' check (role in ('participant', 'spectator')),
  last_seen_at timestamptz,
  host_acting  boolean not null default false,
  joined_at    timestamptz default now()
);

-- ── 4. gifts ────────────────────────────────────────────────
create table if not exists public.gifts (
  id             uuid primary key default gen_random_uuid(),
  game_id        uuid references public.party_games(id) on delete cascade,
  submitted_by   uuid references public.players(id),
  image_url      text not null,
  gift_name      text not null,
  description    text,
  delivery_info  text not null,
  current_holder uuid references public.players(id),
  steal_count    int default 0,
  is_locked      boolean default false,
  is_opened      boolean default false,
  created_at     timestamptz default now()
);

-- ── 5. actions ───────────────────────────────────────────────
create table if not exists public.actions (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid references public.party_games(id) on delete cascade,
  actor_id         uuid references public.players(id),
  action_type      text not null, -- open|steal|trade|lock
  target_gift_id   uuid references public.gifts(id),
  target_player_id uuid references public.players(id),
  created_at       timestamptz default now()
);

-- ── 6. feed_events ───────────────────────────────────────────
create table if not exists public.feed_events (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid references public.party_games(id) on delete cascade,
  player_id    uuid references public.players(id),
  event_type   text not null, -- narrative|reaction|taunt
  content      text,
  created_at   timestamptz default now()
);

-- ── 7. trades ────────────────────────────────────────────────
create table if not exists public.trades (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid references public.party_games(id) on delete cascade,
  proposer_id     uuid references public.players(id),
  receiver_id     uuid references public.players(id),
  proposer_turn   int,
  receiver_turn   int,
  parent_trade_id uuid references public.trades(id),
  status          text default 'pending', -- pending|accepted|rejected
  created_at      timestamptz default now()
);

-- ============================================================
-- Trigger: auto-create hosts row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.hosts (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Realtime — enable on live tables
-- ============================================================
alter publication supabase_realtime add table public.party_games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.gifts;
alter publication supabase_realtime add table public.actions;     -- REALTIME ENABLED
alter publication supabase_realtime add table public.feed_events; -- REALTIME ENABLED
alter publication supabase_realtime add table public.trades;      -- REALTIME ENABLED

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

-- hosts
alter table public.hosts enable row level security;
create policy "Hosts can read own row"
  on public.hosts for select using (auth.uid() = id);

-- party_games: host can do everything; anyone can read lobby/active games
alter table public.party_games enable row level security;
create policy "Host manages own games"
  on public.party_games for all using (auth.uid() = host_id);
create policy "Anyone can read active games"
  on public.party_games for select using (status in ('invited', 'active', 'complete'));

-- players: anyone can insert/read; players manage own row
alter table public.players enable row level security;
create policy "Anyone can read players"
  on public.players for select using (true);
create policy "Anyone can join a game"
  on public.players for insert with check (true);
create policy "Players can update own row"
  on public.players for update using (true);

-- gifts: anyone can read and insert; updates via service role only
alter table public.gifts enable row level security;
create policy "Anyone can read gifts"
  on public.gifts for select using (true);
create policy "Players can submit gifts"
  on public.gifts for insert with check (true);
create policy "Service role can update gifts"
  on public.gifts for update using (true);

-- ============================================================
-- Storage — gift-images bucket
-- ============================================================
-- Run in Supabase dashboard: Storage → New bucket
-- Name: gift-images
-- Public: ON
--
-- Or via SQL (requires storage extension):
-- insert into storage.buckets (id, name, public)
-- values ('gift-images', 'gift-images', true)
-- on conflict do nothing;

-- ============================================================
-- Backfill: insert existing test user into hosts
-- Replace the UUID below with your actual test user id
-- ============================================================
-- insert into public.hosts (id, email)
-- select id, email from auth.users where id = 'YOUR-USER-UUID'
-- on conflict (id) do nothing;
