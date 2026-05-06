-- Phase 2 Community Review Engine schema for The Pit.
-- Run after docs/supabase/phase-1-discipline-engine.sql.

alter table public.strategies
  add column if not exists is_public boolean not null default false,
  add column if not exists source_strategy_id uuid references public.strategies(id) on delete set null;

create table if not exists public.callout_threads (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'other',
  body text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.callout_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.callout_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists strategies_is_public_idx on public.strategies(is_public);
create index if not exists strategies_source_strategy_id_idx on public.strategies(source_strategy_id);
create index if not exists callout_threads_entry_id_idx on public.callout_threads(entry_id);
create index if not exists callout_threads_user_id_idx on public.callout_threads(user_id);
create index if not exists callout_replies_thread_id_idx on public.callout_replies(thread_id);

alter table public.callout_threads enable row level security;
alter table public.callout_replies enable row level security;

drop policy if exists "Users can read public strategy or own strategy" on public.strategies;
create policy "Users can read public strategy or own strategy"
  on public.strategies for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "Users can read callouts" on public.callout_threads;
create policy "Users can read callouts"
  on public.callout_threads for select
  using (true);

drop policy if exists "Users can write own callouts" on public.callout_threads;
create policy "Users can write own callouts"
  on public.callout_threads for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own callouts" on public.callout_threads;
create policy "Users can update own callouts"
  on public.callout_threads for update
  using (auth.uid() = user_id);

drop policy if exists "Users can read callout replies" on public.callout_replies;
create policy "Users can read callout replies"
  on public.callout_replies for select
  using (true);

drop policy if exists "Users can write own callout replies" on public.callout_replies;
create policy "Users can write own callout replies"
  on public.callout_replies for insert
  with check (auth.uid() = user_id);
