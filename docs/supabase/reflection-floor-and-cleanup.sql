-- Reflection Floor patch + owner cleanup helpers for The Pit.
-- Run this after phase-1 and phase-2 SQL.

alter table public.backtest_reflections
  add column if not exists is_public boolean not null default false;

create index if not exists backtest_reflections_is_public_idx
  on public.backtest_reflections(is_public);

do $reflection_floor_constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'backtest_reflections_user_id_profiles_fkey'
  ) then
    alter table public.backtest_reflections
      add constraint backtest_reflections_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end
$reflection_floor_constraints$;

drop policy if exists "Users can read public backtest reflections" on public.backtest_reflections;
create policy "Users can read public backtest reflections"
  on public.backtest_reflections for select
  using (is_public = true);

notify pgrst, 'reload schema';

-- Preview your first few reflection rows before deleting anything.
-- Change username_value and delete_limit in the params CTE.
with params as (
  select 'topfloorprophet'::text as username_value, 3::int as delete_limit
),
me as (
  select profiles.id
  from public.profiles profiles, params
  where profiles.username = params.username_value
),
entry_reflections as (
  select 'entry' as source, entries.id, entries.created_at, entries.symbol as title, entries.reflection as body
  from public.entries entries, me
  where entries.user_id = me.id
    and nullif(trim(entries.reflection), '') is not null
  order by entries.created_at asc
  limit (select delete_limit from params)
),
backtest_reflections_preview as (
  select 'backtest_reflection' as source, reflections.id, reflections.created_at, reflections.title, reflections.body
  from public.backtest_reflections reflections, me
  where reflections.user_id = me.id
  order by reflections.created_at asc
  limit (select delete_limit from params)
)
select * from entry_reflections
union all
select * from backtest_reflections_preview
order by created_at asc;

-- Delete your first few entry reflections by clearing reflection text, not deleting the trade.
-- Uncomment only after the preview above shows the right rows.
/*
with params as (
  select 'topfloorprophet'::text as username_value, 3::int as delete_limit
),
me as (
  select profiles.id
  from public.profiles profiles, params
  where profiles.username = params.username_value
),
targets as (
  select entries.id
  from public.entries entries, me
  where entries.user_id = me.id
    and nullif(trim(entries.reflection), '') is not null
  order by entries.created_at asc
  limit (select delete_limit from params)
)
update public.entries entries
set reflection = '', what_id_do_differently = ''
where entries.id in (select id from targets)
returning entries.id, entries.created_at, entries.symbol;
*/

-- Delete your first few backtest reflection posts entirely.
-- Uncomment only after previewing.
/*
with params as (
  select 'topfloorprophet'::text as username_value, 3::int as delete_limit
),
me as (
  select profiles.id
  from public.profiles profiles, params
  where profiles.username = params.username_value
),
targets as (
  select reflections.id
  from public.backtest_reflections reflections, me
  where reflections.user_id = me.id
  order by reflections.created_at asc
  limit (select delete_limit from params)
)
delete from public.backtest_reflections reflections
where reflections.id in (select id from targets)
returning reflections.id, reflections.created_at, reflections.title;
*/
