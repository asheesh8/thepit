-- Entry form hardening patch for The Pit.
-- Run this on existing Supabase projects if trade logging fails on optional fields.

alter table public.entries
  alter column chart_url set default '',
  add column if not exists risk_amount numeric,
  add column if not exists tags text[] not null default '{}';

update public.entries
set chart_url = ''
where chart_url is null;

alter table public.entries
  alter column chart_url set not null;

notify pgrst, 'reload schema';
