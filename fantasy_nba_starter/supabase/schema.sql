-- Esquema inicial PostgreSQL/Supabase. Revisar y aplicar en un proyecto nuevo.
create extension if not exists pgcrypto;

create type public.league_visibility as enum ('public','private');
create type public.league_status as enum ('pre_draft','drafting','regular_season','playoffs','finished');
create type public.membership_role as enum ('commissioner','manager');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  owner_id uuid not null references auth.users(id),
  visibility public.league_visibility not null default 'private',
  status public.league_status not null default 'pre_draft',
  max_teams smallint not null default 10 check (max_teams between 2 and 30),
  roster_size smallint not null default 13 check (roster_size between 5 and 20),
  scoring_modes text[] not null default array['points','categories'],
  settings jsonb not null default '{}'::jsonb,
  invite_code text unique default encode(gen_random_bytes(6),'hex'),
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_name text not null,
  role public.membership_role not null default 'manager',
  joined_at timestamptz not null default now(),
  primary key (league_id,user_id),
  unique (league_id, team_name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'espn',
  provider_player_id text not null,
  full_name text not null,
  nba_team text,
  positions text[] not null default '{}',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(provider,provider_player_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'espn',
  provider_game_id text not null,
  season text not null,
  home_team text,
  away_team text,
  starts_at timestamptz,
  status text,
  home_score integer,
  away_score integer,
  last_synced_at timestamptz,
  unique(provider,provider_game_id)
);

create table public.player_game_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  game_id uuid not null references public.games(id),
  minutes numeric(5,2),
  points numeric(6,2) not null default 0,
  rebounds numeric(6,2) not null default 0,
  assists numeric(6,2) not null default 0,
  steals numeric(6,2) not null default 0,
  blocks numeric(6,2) not null default 0,
  turnovers numeric(6,2) not null default 0,
  threes_made numeric(6,2) not null default 0,
  fg_made numeric(6,2) not null default 0,
  fg_attempted numeric(6,2) not null default 0,
  ft_made numeric(6,2) not null default 0,
  ft_attempted numeric(6,2) not null default 0,
  source_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique(player_id,game_id)
);

create table public.roster_slots (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  player_id uuid not null references public.players(id),
  slot text not null default 'bench',
  acquired_at timestamptz not null default now(),
  primary key (league_id,user_id,player_id),
  foreign key (league_id,user_id) references public.league_members(league_id,user_id) on delete cascade
);

create table public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  pick_number integer not null,
  round_number integer not null,
  user_id uuid not null,
  player_id uuid references public.players(id),
  picked_at timestamptz,
  unique(league_id,pick_number),
  unique(league_id,player_id),
  foreign key (league_id,user_id) references public.league_members(league_id,user_id)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  proposer_id uuid not null,
  recipient_id uuid not null,
  offered_player_id uuid not null references public.players(id),
  requested_player_id uuid not null references public.players(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (proposer_id <> recipient_id),
  foreign key (league_id,proposer_id) references public.league_members(league_id,user_id),
  foreign key (league_id,recipient_id) references public.league_members(league_id,user_id)
);

create table public.league_messages (
  id bigint generated always as identity primary key,
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  stat_key text not null,
  points_per_unit numeric(8,3) not null,
  unique(league_id,stat_key)
);

-- RLS: activar y añadir políticas específicas antes de exponer las tablas.
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.roster_slots enable row level security;
alter table public.draft_picks enable row level security;
alter table public.trades enable row level security;
alter table public.league_messages enable row level security;
alter table public.scoring_rules enable row level security;

-- No desplegar públicamente hasta definir políticas RLS y transacciones de draft/traspaso.


-- Fantasy league rules extension: credits, lineup locks and market opening.
alter table public.leagues
  add column if not exists initial_credits integer not null default 100 check (initial_credits >= 0),
  add column if not exists starts_at timestamptz,
  add column if not exists market_opens_at timestamptz,
  add column if not exists current_week integer not null default 0 check (current_week >= 0),
  add column if not exists lineup_locked_at timestamptz;

alter table public.league_members
  add column if not exists credits_balance integer not null default 100 check (credits_balance >= 0);

create table if not exists public.lineup_slots (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  player_id uuid not null references public.players(id),
  slot_type text not null check (slot_type in ('starter','bench')),
  slot_number smallint not null check (slot_number between 1 and 13),
  updated_at timestamptz not null default now(),
  primary key (league_id,user_id,slot_number),
  unique (league_id,user_id,player_id),
  foreign key (league_id,user_id) references public.league_members(league_id,user_id) on delete cascade
);

create table if not exists public.market_transactions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null,
  player_id uuid not null references public.players(id),
  transaction_type text not null check (transaction_type in ('purchase','waiver_claim','steal','sale')),
  price integer not null check (price >= 0),
  status text not null default 'completed' check (status in ('pending','completed','cancelled','rejected')),
  created_at timestamptz not null default now(),
  foreign key (league_id,user_id) references public.league_members(league_id,user_id)
);

alter table public.lineup_slots enable row level security;
alter table public.market_transactions enable row level security;


-- v0.3: FAAB blind waivers, dynamic market pricing and round locks.
alter table public.leagues
  add column if not exists faab_initial_budget integer not null default 500 check (faab_initial_budget >= 0),
  add column if not exists market_pricing_mode text not null default 'dynamic'
    check (market_pricing_mode in ('fixed','dynamic')),
  add column if not exists waiver_period_hours integer not null default 24
    check (waiver_period_hours between 1 and 168);

alter table public.players
  add column if not exists market_base_price integer not null default 10 check (market_base_price >= 0),
  add column if not exists market_demand_score numeric not null default 0,
  add column if not exists performance_index numeric not null default 0,
  add column if not exists market_price_updated_at timestamptz;

create table if not exists public.waiver_periods (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open','resolving','resolved','cancelled')),
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.faab_bids (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  waiver_period_id uuid not null references public.waiver_periods(id) on delete cascade,
  user_id uuid not null,
  player_id uuid not null references public.players(id),
  bid_amount integer not null check (bid_amount > 0),
  priority_rank integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','won','lost','invalid','cancelled')),
  created_at timestamptz not null default now(),
  foreign key (league_id,user_id) references public.league_members(league_id,user_id),
  unique (waiver_period_id,user_id,player_id)
);

create index if not exists faab_bids_resolution_idx
  on public.faab_bids(waiver_period_id, bid_amount desc);

alter table public.waiver_periods enable row level security;
alter table public.faab_bids enable row level security;

-- Important: blind bid amounts must never be readable by rival users.
-- Production RLS policies must allow a member to SELECT only their own bids;
-- only a trusted server-side resolver may read all bids before close and settle them.
-- Enforce roster limit (13), max 5 starters, one owner per player, budget non-negative,
-- and week lock checks in a transaction/RPC, not only in frontend JavaScript.
