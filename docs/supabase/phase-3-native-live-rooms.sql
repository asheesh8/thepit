-- Phase 3 Native Live Rooms schema for The Pit.
-- Run after Phase 1 and Phase 2 SQL.

create table if not exists public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  room_type text not null default 'open_floor',
  is_public boolean not null default true,
  room_password text default '',
  dm_peer_id uuid references auth.users(id) on delete cascade,
  status text not null default 'live' check (status in ('live', 'complete')),
  linked_entry_id uuid references public.entries(id) on delete set null,
  linked_strategy_id uuid references public.strategies(id) on delete set null,
  agenda text default '',
  notes text default '',
  music_url text default '',
  music_title text default '',
  music_queue jsonb not null default '[]'::jsonb,
  music_current_index integer not null default 0,
  music_is_playing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.live_rooms
  add column if not exists room_password text default '',
  add column if not exists dm_peer_id uuid references auth.users(id) on delete cascade,
  add column if not exists music_queue jsonb not null default '[]'::jsonb,
  add column if not exists music_current_index integer not null default 0;

alter table public.profiles
  add column if not exists avatar_url text default '';

create table if not exists public.live_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.live_room_action_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_room_presence (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists live_rooms_status_idx on public.live_rooms(status);
create index if not exists live_rooms_is_public_idx on public.live_rooms(is_public);
create index if not exists live_rooms_host_id_idx on public.live_rooms(host_id);
create index if not exists live_rooms_dm_peer_id_idx on public.live_rooms(dm_peer_id);
create index if not exists live_room_messages_room_id_idx on public.live_room_messages(room_id);
create index if not exists live_room_action_items_room_id_idx on public.live_room_action_items(room_id);
create index if not exists live_room_presence_room_id_idx on public.live_room_presence(room_id);
create index if not exists live_room_presence_last_seen_idx on public.live_room_presence(last_seen);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'live_rooms_dm_peer_id_profiles_fkey'
  ) then
    alter table public.live_rooms
      add constraint live_rooms_dm_peer_id_profiles_fkey
      foreign key (dm_peer_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_rooms_host_id_profiles_fkey'
  ) then
    alter table public.live_rooms
      add constraint live_rooms_host_id_profiles_fkey
      foreign key (host_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_room_messages_user_id_profiles_fkey'
  ) then
    alter table public.live_room_messages
      add constraint live_room_messages_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_room_action_items_user_id_profiles_fkey'
  ) then
    alter table public.live_room_action_items
      add constraint live_room_action_items_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'live_room_presence_user_id_profiles_fkey'
  ) then
    alter table public.live_room_presence
      add constraint live_room_presence_user_id_profiles_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

alter table public.live_rooms enable row level security;
alter table public.live_room_messages enable row level security;
alter table public.live_room_action_items enable row level security;
alter table public.live_room_presence enable row level security;

drop policy if exists "Users can read visible rooms" on public.live_rooms;
create policy "Users can read visible rooms"
  on public.live_rooms for select
  using (
    room_type <> 'dm'
    or auth.uid() = host_id
    or auth.uid() = dm_peer_id
  );

drop policy if exists "Users can create own rooms" on public.live_rooms;
create policy "Users can create own rooms"
  on public.live_rooms for insert
  with check (
    auth.uid() = host_id
    and (
      room_type <> 'dm'
      or (
        dm_peer_id is not null
        and exists (
          select 1 from public.follows mine
          where mine.follower_id = auth.uid()
            and mine.following_id = dm_peer_id
        )
        and exists (
          select 1 from public.follows theirs
          where theirs.follower_id = dm_peer_id
            and theirs.following_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Hosts can update own rooms" on public.live_rooms;
create policy "Hosts can update own rooms"
  on public.live_rooms for update
  using (auth.uid() = host_id or auth.uid() = dm_peer_id);

drop policy if exists "Users can read room messages" on public.live_room_messages;
create policy "Users can read room messages"
  on public.live_room_messages for select
  using (
    exists (
      select 1 from public.live_rooms room
      where room.id = live_room_messages.room_id
        and (
          room.room_type <> 'dm'
          or auth.uid() = room.host_id
          or auth.uid() = room.dm_peer_id
        )
    )
  );

drop policy if exists "Users can write own room messages" on public.live_room_messages;
create policy "Users can write own room messages"
  on public.live_room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_rooms room
      where room.id = live_room_messages.room_id
        and (
          room.room_type <> 'dm'
          or auth.uid() = room.host_id
          or auth.uid() = room.dm_peer_id
        )
    )
  );

drop policy if exists "Users can read room action items" on public.live_room_action_items;
create policy "Users can read room action items"
  on public.live_room_action_items for select
  using (
    exists (
      select 1 from public.live_rooms room
      where room.id = live_room_action_items.room_id
        and (
          room.room_type <> 'dm'
          or auth.uid() = room.host_id
          or auth.uid() = room.dm_peer_id
        )
    )
  );

drop policy if exists "Users can write own room action items" on public.live_room_action_items;
create policy "Users can write own room action items"
  on public.live_room_action_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_rooms room
      where room.id = live_room_action_items.room_id
        and (
          room.room_type <> 'dm'
          or auth.uid() = room.host_id
          or auth.uid() = room.dm_peer_id
        )
    )
  );

drop policy if exists "Users can update room action items" on public.live_room_action_items;
create policy "Users can update room action items"
  on public.live_room_action_items for update
  using (auth.uid() = user_id);

drop policy if exists "Users can read room presence" on public.live_room_presence;
create policy "Users can read room presence"
  on public.live_room_presence for select
  using (true);

drop policy if exists "Users can write own room presence" on public.live_room_presence;
create policy "Users can write own room presence"
  on public.live_room_presence for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own room presence" on public.live_room_presence;
create policy "Users can update own room presence"
  on public.live_room_presence for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own room presence" on public.live_room_presence;
create policy "Users can delete own room presence"
  on public.live_room_presence for delete
  using (auth.uid() = user_id);

create or replace function public.cleanup_stale_live_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.live_rooms room
  where room.status = 'live'
    and room.room_type <> 'dm'
    and room.created_at < now() - interval '3 hours'
    and not exists (
      select 1
      from public.live_room_presence presence
      where presence.room_id = room.id
        and presence.last_seen > now() - interval '3 hours'
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_stale_live_rooms() to authenticated;

-- Optional true background cleanup if pg_cron is enabled in your Supabase project:
-- select cron.schedule(
--   'cleanup-stale-live-rooms',
--   '*/15 * * * *',
--   $$select public.cleanup_stale_live_rooms();$$
-- );
