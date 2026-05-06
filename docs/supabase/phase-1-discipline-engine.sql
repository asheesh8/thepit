-- Phase 1 Discipline Engine schema for The Pit.
-- Run this in the Supabase SQL editor before using strategies, badges, and backtesting.

alter table public.entries
  add column if not exists trade_context text not null default 'personal_sim'
    check (trade_context in ('combine', 'funded', 'backtest', 'personal_sim')),
  add column if not exists strategy_id uuid;

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  market text default '',
  timeframes text default '',
  setup_conditions text default '',
  entry_rules text default '',
  stop_rules text default '',
  take_profit_rules text default '',
  invalidation_rules text default '',
  risk_rules text default '',
  mistakes_to_avoid text default '',
  example_notes text default '',
  mantra text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entries
  add constraint entries_strategy_id_fkey
  foreign key (strategy_id) references public.strategies(id) on delete set null;

create table if not exists public.backtest_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  title text not null,
  body text not null,
  sample_size integer,
  lesson text default '',
  next_follow_through text default '',
  completed_follow_through boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists strategies_user_id_idx on public.strategies(user_id);
create index if not exists entries_strategy_id_idx on public.entries(strategy_id);
create index if not exists entries_trade_context_idx on public.entries(trade_context);
create index if not exists backtest_reflections_user_id_idx on public.backtest_reflections(user_id);
create index if not exists backtest_reflections_strategy_id_idx on public.backtest_reflections(strategy_id);
create index if not exists user_badges_user_id_idx on public.user_badges(user_id);

alter table public.strategies enable row level security;
alter table public.backtest_reflections enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "Users can read own strategies" on public.strategies;
create policy "Users can read own strategies"
  on public.strategies for select
  using (auth.uid() = user_id);

drop policy if exists "Users can write own strategies" on public.strategies;
create policy "Users can write own strategies"
  on public.strategies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own backtest reflections" on public.backtest_reflections;
create policy "Users can read own backtest reflections"
  on public.backtest_reflections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can write own backtest reflections" on public.backtest_reflections;
create policy "Users can write own backtest reflections"
  on public.backtest_reflections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own badges" on public.user_badges;
create policy "Users can read own badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

drop policy if exists "Users can earn own badges" on public.user_badges;
create policy "Users can earn own badges"
  on public.user_badges for insert
  with check (auth.uid() = user_id);
