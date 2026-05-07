
-- Add goal_text for the MotivationVault
alter table public.profiles
  add column if not exists goal_text text not null default '';
