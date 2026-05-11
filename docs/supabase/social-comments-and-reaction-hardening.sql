-- Production feature repair.
-- Run this against existing Supabase projects that were created before
-- comments, post_comments, and profile resources were added to the canonical schema.

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

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

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

grant select on public.post_comments to anon, authenticated;
grant insert, delete on public.post_comments to authenticated;

create table if not exists public.resources (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null,
  url        text        not null,
  category   text        not null default 'other'
                         check (category in ('mentorship', 'psychology', 'strategy', 'tools', 'other')),
  sort_order integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists resources_user_id_idx on public.resources(user_id);
create index if not exists resources_sort_idx    on public.resources(user_id, sort_order);

alter table public.resources enable row level security;

drop policy if exists "Resources are publicly readable" on public.resources;
create policy "Resources are publicly readable"
  on public.resources for select using (true);

drop policy if exists "Users can add own resources" on public.resources;
create policy "Users can add own resources"
  on public.resources for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can delete own resources" on public.resources;
create policy "Users can delete own resources"
  on public.resources for delete to authenticated using (auth.uid() = user_id);

grant select on public.resources to anon, authenticated;
grant insert, delete on public.resources to authenticated;

notify pgrst, 'reload schema';
