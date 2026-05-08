create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  sleep_quality text not null default 'okay',
  mood text,
  made_bed boolean not null default false,
  drank_water boolean not null default false,
  impaired_focus boolean not null default false,
  honesty_note text,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date),
  constraint daily_checkins_sleep_quality_check
    check (sleep_quality in ('bad', 'okay', 'good', 'locked in'))
);

create table if not exists public.pinned_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  context text not null default 'global',
  is_pinned boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint pinned_rules_context_check
    check (context in ('global', 'feed', 'journal', 'log_trade', 'backtesting', 'review')),
  constraint pinned_rules_body_check
    check (length(trim(body)) > 0)
);

alter table public.daily_checkins enable row level security;
alter table public.pinned_rules enable row level security;

drop policy if exists "Users can read own daily checkins" on public.daily_checkins;
create policy "Users can read own daily checkins"
on public.daily_checkins for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily checkins" on public.daily_checkins;
create policy "Users can insert own daily checkins"
on public.daily_checkins for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily checkins" on public.daily_checkins;
create policy "Users can update own daily checkins"
on public.daily_checkins for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily checkins" on public.daily_checkins;
create policy "Users can delete own daily checkins"
on public.daily_checkins for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can read own pinned rules" on public.pinned_rules;
create policy "Users can read own pinned rules"
on public.pinned_rules for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own pinned rules" on public.pinned_rules;
create policy "Users can insert own pinned rules"
on public.pinned_rules for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own pinned rules" on public.pinned_rules;
create policy "Users can update own pinned rules"
on public.pinned_rules for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pinned rules" on public.pinned_rules;
create policy "Users can delete own pinned rules"
on public.pinned_rules for delete to authenticated
using (auth.uid() = user_id);

create index if not exists daily_checkins_user_date_idx
on public.daily_checkins (user_id, checkin_date desc);

create index if not exists pinned_rules_user_context_idx
on public.pinned_rules (user_id, context, is_pinned, sort_order);

notify pgrst, 'reload schema';
