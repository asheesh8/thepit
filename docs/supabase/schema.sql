-- =============================================================================
-- THE PIT — complete database schema
-- =============================================================================
-- Run this once on a fresh Supabase project (or after a full wipe).
-- Every statement is idempotent — safe to re-run if something fails mid-way.
--
-- ORDER MATTERS. Do not rearrange blocks.
--
-- After running, go to Supabase > Storage and create two public buckets:
--   • avatars   (profile photos)
--   • charts    (trade chart images + post media)
-- =============================================================================


-- =============================================================================
-- SECTION 1 · PROFILES
-- =============================================================================
-- One row per auth user. Created manually in Auth.jsx after signup.
-- Mirrors auth.users(id) so we can do FK joins from any table.

create table if not exists public.profiles (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  username           text        not null unique,
  email              text        not null default '',
  bio                text        not null default '',
  avatar_url         text        not null default '',
  trading_categories text[]      not null default '{}',
  goal_text          text        not null default '',
  created_at         timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles(username);

-- Auto-create a profile row when a new auth user signs up.
-- The app also inserts manually on signup, so this is a safety net.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable"  on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

drop policy if exists "Users can insert own profile"    on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile"    on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);


-- =============================================================================
-- SECTION 2 · FOLLOWS
-- =============================================================================

create table if not exists public.follows (
  follower_id  uuid        not null references public.profiles(id) on delete cascade,
  following_id uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create index if not exists follows_follower_id_idx  on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

alter table public.follows enable row level security;

drop policy if exists "Follows are publicly readable" on public.follows;
create policy "Follows are publicly readable"
  on public.follows for select using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);


-- =============================================================================
-- SECTION 3 · STRATEGIES
-- =============================================================================

create table if not exists public.strategies (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references public.profiles(id) on delete cascade,
  name               text        not null,
  market             text        not null default '',
  timeframes         text        not null default '',
  setup_conditions   text        not null default '',
  entry_rules        text        not null default '',
  stop_rules         text        not null default '',
  take_profit_rules  text        not null default '',
  invalidation_rules text        not null default '',
  risk_rules         text        not null default '',
  mistakes_to_avoid  text        not null default '',
  example_notes      text        not null default '',
  mantra             text        not null default '',
  is_public          boolean     not null default false,
  source_strategy_id uuid        references public.strategies(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists strategies_user_id_idx  on public.strategies(user_id);
create index if not exists strategies_is_public_idx on public.strategies(is_public);

alter table public.strategies enable row level security;

drop policy if exists "Users can read own or public strategies" on public.strategies;
create policy "Users can read own or public strategies"
  on public.strategies for select
  using (auth.uid() = user_id or is_public = true);

drop policy if exists "Users can write own strategies" on public.strategies;
create policy "Users can write own strategies"
  on public.strategies for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 4 · ENTRIES (trade journal)
-- =============================================================================

create table if not exists public.entries (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  symbol                text        not null,
  direction             text        not null default 'long'
                                    check (direction in ('long', 'short', 'flat')),
  entry_price           numeric,
  exit_price            numeric,
  pnl                   numeric,
  mindset_rating        integer     check (mindset_rating between 1 and 10),
  reflection            text        not null default '',
  what_id_do_differently text       not null default '',
  is_public             boolean     not null default false,
  trade_context         text        not null default 'personal_sim'
                                    check (trade_context in ('combine', 'funded', 'backtest', 'personal_sim')),
  strategy_id           uuid        references public.strategies(id) on delete set null,
  chart_url             text        not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists entries_user_id_idx       on public.entries(user_id);
create index if not exists entries_is_public_idx     on public.entries(is_public);
create index if not exists entries_strategy_id_idx   on public.entries(strategy_id);
create index if not exists entries_trade_context_idx on public.entries(trade_context);
create index if not exists entries_created_at_idx    on public.entries(created_at desc);

alter table public.entries enable row level security;

drop policy if exists "Users can read own entries"    on public.entries;
create policy "Users can read own entries"
  on public.entries for select using (auth.uid() = user_id);

drop policy if exists "Public entries are readable"   on public.entries;
create policy "Public entries are readable"
  on public.entries for select using (is_public = true);

drop policy if exists "Users can write own entries"   on public.entries;
create policy "Users can write own entries"
  on public.entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 5 · REACTIONS (on entries)
-- =============================================================================

create table if not exists public.reactions (
  entry_id   uuid not null references public.entries(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('props', 'callout')),
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);

create index if not exists reactions_entry_id_idx on public.reactions(entry_id);

alter table public.reactions enable row level security;

drop policy if exists "Reactions are publicly readable" on public.reactions;
create policy "Reactions are publicly readable"
  on public.reactions for select using (true);

drop policy if exists "Users can react" on public.reactions;
create policy "Users can react"
  on public.reactions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can change own reaction" on public.reactions;
create policy "Users can change own reaction"
  on public.reactions for update using (auth.uid() = user_id);

drop policy if exists "Users can remove own reaction" on public.reactions;
create policy "Users can remove own reaction"
  on public.reactions for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 5A · COMMENTS (on entries)
-- =============================================================================

create table if not exists public.comments (
  id         uuid        primary key default gen_random_uuid(),
  entry_id   uuid        not null references public.entries(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_entry_id_idx on public.comments(entry_id);
create index if not exists comments_user_id_idx  on public.comments(user_id);

alter table public.comments enable row level security;

drop policy if exists "Entry comments are publicly readable" on public.comments;
create policy "Entry comments are publicly readable"
  on public.comments for select using (true);

drop policy if exists "Users can comment on entries" on public.comments;
create policy "Users can comment on entries"
  on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own entry comments" on public.comments;
create policy "Users can delete own entry comments"
  on public.comments for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 6 · POSTS (free-text floor posts)
-- =============================================================================

create table if not exists public.posts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text,
  media_url  text        not null default '',
  created_at timestamptz not null default now()
);

create index if not exists posts_user_id_idx    on public.posts(user_id);
create index if not exists posts_created_at_idx on public.posts(created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Posts are publicly readable" on public.posts;
create policy "Posts are publicly readable"
  on public.posts for select using (true);

drop policy if exists "Users can create own posts" on public.posts;
create policy "Users can create own posts"
  on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts"
  on public.posts for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 7 · POST REACTIONS
-- =============================================================================

create table if not exists public.post_reactions (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('props', 'callout')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_reactions_post_id_idx on public.post_reactions(post_id);

alter table public.post_reactions enable row level security;

drop policy if exists "Post reactions are publicly readable" on public.post_reactions;
create policy "Post reactions are publicly readable"
  on public.post_reactions for select using (true);

drop policy if exists "Users can react to posts" on public.post_reactions;
create policy "Users can react to posts"
  on public.post_reactions for insert with check (auth.uid() = user_id);

drop policy if exists "Users can change own post reaction" on public.post_reactions;
create policy "Users can change own post reaction"
  on public.post_reactions for update using (auth.uid() = user_id);

drop policy if exists "Users can remove own post reaction" on public.post_reactions;
create policy "Users can remove own post reaction"
  on public.post_reactions for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 7A · POST COMMENTS
-- =============================================================================

create table if not exists public.post_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.posts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx on public.post_comments(post_id);
create index if not exists post_comments_user_id_idx on public.post_comments(user_id);

alter table public.post_comments enable row level security;

drop policy if exists "Post comments are publicly readable" on public.post_comments;
create policy "Post comments are publicly readable"
  on public.post_comments for select using (true);

drop policy if exists "Users can comment on posts" on public.post_comments;
create policy "Users can comment on posts"
  on public.post_comments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own post comments" on public.post_comments;
create policy "Users can delete own post comments"
  on public.post_comments for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 8 · BACKTEST REFLECTIONS
-- =============================================================================

create table if not exists public.backtest_reflections (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  strategy_id           uuid        not null references public.strategies(id) on delete cascade,
  title                 text        not null,
  body                  text        not null,
  sample_size           integer,
  lesson                text        not null default '',
  next_follow_through   text        not null default '',
  completed_follow_through boolean  not null default false,
  is_public             boolean     not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists backtest_reflections_user_id_idx     on public.backtest_reflections(user_id);
create index if not exists backtest_reflections_strategy_id_idx on public.backtest_reflections(strategy_id);
create index if not exists backtest_reflections_is_public_idx   on public.backtest_reflections(is_public);

alter table public.backtest_reflections enable row level security;

drop policy if exists "Users can read own backtest reflections"    on public.backtest_reflections;
create policy "Users can read own backtest reflections"
  on public.backtest_reflections for select using (auth.uid() = user_id);

drop policy if exists "Public backtest reflections are readable"   on public.backtest_reflections;
create policy "Public backtest reflections are readable"
  on public.backtest_reflections for select using (is_public = true);

drop policy if exists "Users can write own backtest reflections"   on public.backtest_reflections;
create policy "Users can write own backtest reflections"
  on public.backtest_reflections for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 9 · USER BADGES
-- =============================================================================

create table if not exists public.user_badges (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  badge_key  text        not null,
  earned_at  timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists user_badges_user_id_idx on public.user_badges(user_id);

alter table public.user_badges enable row level security;

drop policy if exists "Users can read own badges" on public.user_badges;
create policy "Users can read own badges"
  on public.user_badges for select using (auth.uid() = user_id);

drop policy if exists "Users can earn own badges" on public.user_badges;
create policy "Users can earn own badges"
  on public.user_badges for insert with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 10 · CALLOUT THREADS + REPLIES
-- =============================================================================

create table if not exists public.callout_threads (
  id          uuid        primary key default gen_random_uuid(),
  entry_id    uuid        not null references public.entries(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  reason      text        not null default 'other',
  body        text        not null,
  is_resolved boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.callout_replies (
  id         uuid        primary key default gen_random_uuid(),
  thread_id  uuid        not null references public.callout_threads(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists callout_threads_entry_id_idx on public.callout_threads(entry_id);
create index if not exists callout_threads_user_id_idx  on public.callout_threads(user_id);
create index if not exists callout_replies_thread_id_idx on public.callout_replies(thread_id);

alter table public.callout_threads enable row level security;
alter table public.callout_replies  enable row level security;

drop policy if exists "Callout threads are publicly readable"    on public.callout_threads;
create policy "Callout threads are publicly readable"
  on public.callout_threads for select using (true);

drop policy if exists "Users can create callout threads"         on public.callout_threads;
create policy "Users can create callout threads"
  on public.callout_threads for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own callout threads"     on public.callout_threads;
create policy "Users can update own callout threads"
  on public.callout_threads for update using (auth.uid() = user_id);

drop policy if exists "Callout replies are publicly readable"    on public.callout_replies;
create policy "Callout replies are publicly readable"
  on public.callout_replies for select using (true);

drop policy if exists "Users can create callout replies"         on public.callout_replies;
create policy "Users can create callout replies"
  on public.callout_replies for insert with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 11 · DAILY CHECK-INS
-- =============================================================================

create table if not exists public.daily_checkins (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  checkin_date    date        not null,
  sleep_quality   text        not null default 'okay'
                              check (sleep_quality in ('bad', 'okay', 'good', 'locked in')),
  mood            text,
  made_bed        boolean     not null default false,
  drank_water     boolean     not null default false,
  impaired_focus  boolean     not null default false,
  honesty_note    text,
  created_at      timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create index if not exists daily_checkins_user_date_idx
  on public.daily_checkins(user_id, checkin_date desc);

alter table public.daily_checkins enable row level security;

drop policy if exists "Users can read own check-ins"   on public.daily_checkins;
create policy "Users can read own check-ins"
  on public.daily_checkins for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own check-ins" on public.daily_checkins;
create policy "Users can insert own check-ins"
  on public.daily_checkins for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own check-ins" on public.daily_checkins;
create policy "Users can update own check-ins"
  on public.daily_checkins for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own check-ins" on public.daily_checkins;
create policy "Users can delete own check-ins"
  on public.daily_checkins for delete to authenticated using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 12 · PINNED RULES
-- =============================================================================

create table if not exists public.pinned_rules (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null check (length(trim(body)) > 0),
  context    text        not null default 'global'
             check (context in ('global', 'feed', 'journal', 'log_trade', 'backtesting', 'review')),
  is_pinned  boolean     not null default true,
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pinned_rules_user_context_idx
  on public.pinned_rules(user_id, context, is_pinned, sort_order);

alter table public.pinned_rules enable row level security;

drop policy if exists "Users can read own pinned rules"   on public.pinned_rules;
create policy "Users can read own pinned rules"
  on public.pinned_rules for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own pinned rules" on public.pinned_rules;
create policy "Users can insert own pinned rules"
  on public.pinned_rules for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own pinned rules" on public.pinned_rules;
create policy "Users can update own pinned rules"
  on public.pinned_rules for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pinned rules" on public.pinned_rules;
create policy "Users can delete own pinned rules"
  on public.pinned_rules for delete to authenticated using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 13 · LIVE ROOMS (DMs, group chats, open rooms)
-- =============================================================================
-- room_type values:
--   dm         → private 1-on-1 thread (requires mutual follows)
--   group      → multi-user chat thread (members tracked in live_room_members)
--   open_floor → public room anyone can join
--   strategy   → room linked to a specific strategy

create table if not exists public.live_rooms (
  id                  uuid        primary key default gen_random_uuid(),
  host_id             uuid        not null references public.profiles(id) on delete cascade,
  title               text        not null,
  room_type           text        not null default 'open_floor'
                                  check (room_type in ('dm', 'group', 'open_floor', 'strategy')),
  is_public           boolean     not null default true,
  room_password       text        not null default '',
  dm_peer_id          uuid        references public.profiles(id) on delete cascade,
  status              text        not null default 'live'
                                  check (status in ('live', 'complete')),
  linked_entry_id     uuid        references public.entries(id) on delete set null,
  linked_strategy_id  uuid        references public.strategies(id) on delete set null,
  agenda              text        not null default '',
  notes               text        not null default '',
  music_url           text        not null default '',
  music_title         text        not null default '',
  music_queue         jsonb       not null default '[]'::jsonb,
  music_current_index integer     not null default 0,
  music_is_playing    boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists live_rooms_status_idx      on public.live_rooms(status);
create index if not exists live_rooms_is_public_idx   on public.live_rooms(is_public);
create index if not exists live_rooms_host_id_idx     on public.live_rooms(host_id);
create index if not exists live_rooms_dm_peer_id_idx  on public.live_rooms(dm_peer_id);
create index if not exists live_rooms_room_type_idx   on public.live_rooms(room_type);

alter table public.live_rooms enable row level security;


-- =============================================================================
-- SECTION 14 · LIVE ROOM MEMBERS (group chat membership)
-- =============================================================================
-- Created before live_rooms RLS policies because those policies reference this table.

create table if not exists public.live_room_members (
  room_id    uuid        not null references public.live_rooms(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists live_room_members_user_id_idx on public.live_room_members(user_id);

alter table public.live_room_members enable row level security;

drop policy if exists "Members can read own memberships" on public.live_room_members;
create policy "Members can read own memberships"
  on public.live_room_members for select using (auth.uid() = user_id);

drop policy if exists "Hosts can add members" on public.live_room_members;
create policy "Hosts can add members"
  on public.live_room_members for insert
  with check (
    exists (
      select 1 from public.live_rooms r
      where r.id = room_id and r.host_id = auth.uid()
    )
    or auth.uid() = user_id
  );

drop policy if exists "Members can leave" on public.live_room_members;
create policy "Members can leave"
  on public.live_room_members for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 13 (cont.) · LIVE ROOMS RLS policies
-- =============================================================================
-- Applied after live_room_members exists so the subquery references resolve.

drop policy if exists "Users can read visible rooms" on public.live_rooms;
create policy "Users can read visible rooms"
  on public.live_rooms for select
  using (
    room_type not in ('dm', 'group')
    or auth.uid() = host_id
    or auth.uid() = dm_peer_id
    or exists (
      select 1 from public.live_room_members m
      where m.room_id = live_rooms.id and m.user_id = auth.uid()
    )
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
          select 1 from public.follows f1
          where f1.follower_id = auth.uid() and f1.following_id = dm_peer_id
        )
        and exists (
          select 1 from public.follows f2
          where f2.follower_id = dm_peer_id and f2.following_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Room participants can update rooms" on public.live_rooms;
create policy "Room participants can update rooms"
  on public.live_rooms for update
  using (
    auth.uid() = host_id
    or auth.uid() = dm_peer_id
    or exists (
      select 1 from public.live_room_members m
      where m.room_id = live_rooms.id and m.user_id = auth.uid()
    )
  );


-- =============================================================================
-- SECTION 15 · LIVE ROOM MESSAGES
-- =============================================================================

create table if not exists public.live_room_messages (
  id         uuid        primary key default gen_random_uuid(),
  room_id    uuid        not null references public.live_rooms(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists live_room_messages_room_id_idx on public.live_room_messages(room_id);
create index if not exists live_room_messages_created_idx on public.live_room_messages(created_at);

alter table public.live_room_messages enable row level security;

drop policy if exists "Room participants can read messages" on public.live_room_messages;
create policy "Room participants can read messages"
  on public.live_room_messages for select
  using (
    exists (
      select 1 from public.live_rooms r
      where r.id = live_room_messages.room_id
        and (
          r.room_type not in ('dm', 'group')
          or auth.uid() = r.host_id
          or auth.uid() = r.dm_peer_id
          or exists (
            select 1 from public.live_room_members m
            where m.room_id = r.id and m.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Room participants can send messages" on public.live_room_messages;
create policy "Room participants can send messages"
  on public.live_room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_rooms r
      where r.id = live_room_messages.room_id
        and (
          r.room_type not in ('dm', 'group')
          or auth.uid() = r.host_id
          or auth.uid() = r.dm_peer_id
          or exists (
            select 1 from public.live_room_members m
            where m.room_id = r.id and m.user_id = auth.uid()
          )
        )
    )
  );


-- =============================================================================
-- SECTION 16 · LIVE ROOM ACTION ITEMS
-- =============================================================================

create table if not exists public.live_room_action_items (
  id         uuid        primary key default gen_random_uuid(),
  room_id    uuid        not null references public.live_rooms(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  body       text        not null,
  is_done    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_room_action_items_room_id_idx on public.live_room_action_items(room_id);

alter table public.live_room_action_items enable row level security;

drop policy if exists "Room participants can read action items" on public.live_room_action_items;
create policy "Room participants can read action items"
  on public.live_room_action_items for select
  using (
    exists (
      select 1 from public.live_rooms r
      where r.id = live_room_action_items.room_id
        and (r.room_type not in ('dm', 'group') or auth.uid() = r.host_id or auth.uid() = r.dm_peer_id)
    )
  );

drop policy if exists "Room participants can add action items" on public.live_room_action_items;
create policy "Room participants can add action items"
  on public.live_room_action_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.live_rooms r
      where r.id = live_room_action_items.room_id
        and (r.room_type not in ('dm', 'group') or auth.uid() = r.host_id or auth.uid() = r.dm_peer_id)
    )
  );

drop policy if exists "Users can update own action items" on public.live_room_action_items;
create policy "Users can update own action items"
  on public.live_room_action_items for update using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 17 · LIVE ROOM PRESENCE (WebRTC signaling / open rooms)
-- =============================================================================

create table if not exists public.live_room_presence (
  room_id    uuid        not null references public.live_rooms(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists live_room_presence_room_id_idx  on public.live_room_presence(room_id);
create index if not exists live_room_presence_last_seen_idx on public.live_room_presence(last_seen);

alter table public.live_room_presence enable row level security;

drop policy if exists "Presence is publicly readable"          on public.live_room_presence;
create policy "Presence is publicly readable"
  on public.live_room_presence for select using (true);

drop policy if exists "Users can join rooms"                   on public.live_room_presence;
create policy "Users can join rooms"
  on public.live_room_presence for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own presence"          on public.live_room_presence;
create policy "Users can update own presence"
  on public.live_room_presence for update using (auth.uid() = user_id);

drop policy if exists "Users can leave rooms"                  on public.live_room_presence;
create policy "Users can leave rooms"
  on public.live_room_presence for delete using (auth.uid() = user_id);


-- =============================================================================
-- SECTION 18 · PROP FIRM ACCOUNTS (Vault)
-- =============================================================================

create table if not exists public.prop_accounts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  firm_name        text        not null,
  account_type     text        not null default '',
  account_size     numeric     not null default 0,
  entry_fee        numeric     not null default 0,
  profit_target    numeric     not null default 0,
  max_drawdown     numeric     not null default 0,
  daily_drawdown   numeric     not null default 0,
  current_balance  numeric     not null default 0,
  status           text        not null default 'active'
                               check (status in ('active', 'passed', 'failed', 'payout_pending', 'withdrawn')),
  notes            text        not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists prop_accounts_user_id_idx on public.prop_accounts(user_id);

alter table public.prop_accounts enable row level security;

drop policy if exists "Users can manage own prop accounts" on public.prop_accounts;
create policy "Users can manage own prop accounts"
  on public.prop_accounts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 19 · PAYOUTS (Vault)
-- =============================================================================

create table if not exists public.payouts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null default 'payout'
             check (type in ('payout', 'fee', 'reset')),
  amount     numeric     not null,
  source     text        not null default '',
  date       date        not null,
  notes      text        not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payouts_user_id_idx on public.payouts(user_id);
create index if not exists payouts_date_idx    on public.payouts(date desc);

alter table public.payouts enable row level security;

drop policy if exists "Users can manage own payouts" on public.payouts;
create policy "Users can manage own payouts"
  on public.payouts for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================================
-- SECTION 20 · REALTIME PUBLICATIONS
-- =============================================================================
-- Enable Realtime on tables that need live updates.

do $$
begin
  -- live_room_messages — DM chat and open room chat
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_room_messages'
  ) then
    alter publication supabase_realtime add table public.live_room_messages;
  end if;

  -- live_room_presence — WebRTC signaling
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_room_presence'
  ) then
    alter publication supabase_realtime add table public.live_room_presence;
  end if;

  -- live_rooms — room metadata updates (notes, music queue, status)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_rooms'
  ) then
    alter publication supabase_realtime add table public.live_rooms;
  end if;
end $$;


-- =============================================================================
-- SECTION 21 · STALE ROOM CLEANUP FUNCTION
-- =============================================================================
-- Cleans up open_floor rooms with no presence activity in the last 3 hours.
-- Call manually or wire up with pg_cron if enabled.

create or replace function public.cleanup_stale_live_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.live_rooms
  where status = 'live'
    and room_type not in ('dm', 'group')
    and created_at < now() - interval '3 hours'
    and not exists (
      select 1 from public.live_room_presence p
      where p.room_id = live_rooms.id
        and p.last_seen > now() - interval '3 hours'
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.cleanup_stale_live_rooms() to authenticated;

-- To automate with pg_cron (enable it in Supabase > Database > Extensions first):
-- select cron.schedule(
--   'cleanup-stale-live-rooms',
--   '*/15 * * * *',
--   $$select public.cleanup_stale_live_rooms();$$
-- );


-- =============================================================================
-- SECTION 22 · SCHEMA CACHE REFRESH
-- =============================================================================

notify pgrst, 'reload schema';


-- =============================================================================
-- DONE
-- =============================================================================
-- Storage buckets to create manually in Supabase > Storage:
--
--   avatars  (public)  — profile photos uploaded from Account Settings
--   charts   (public)  — trade chart images + post media
--
-- Both need a public policy:
--   "Allow public read"  → select, true
--   "Allow auth uploads" → insert, auth.role() = 'authenticated'
-- =============================================================================
