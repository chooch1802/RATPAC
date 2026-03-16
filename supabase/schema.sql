-- Ratpac — full schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────
create type wager_status as enum (
  'PENDING',
  'ACTIVE',
  'AWAITING_RESULT',
  'DISPUTED',
  'SETTLED',
  'VOIDED',
  'EXPIRED'
);

create type payment_method as enum ('Venmo', 'Cash App', 'PayPal', 'Other');

create type notification_type as enum (
  'CHALLENGE_RECEIVED',
  'CHALLENGE_ACCEPTED',
  'CHALLENGE_DECLINED',
  'WAGER_SETTLED_WIN',
  'WAGER_SETTLED_LOSS',
  'WAGER_VOIDED',
  'RESULT_CONFIRM_REQUEST',
  'RESULT_DISPUTED',
  'WAGER_EXPIRED',
  'NEW_FOLLOWER',
  'FOLLOW_REQUEST',
  'COMMENT',
  'TEAM_INVITE'
);

-- ─────────────────────────────────────────────
-- Profiles
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  handle          text unique not null,
  display_name    text,
  avatar_url      text,
  is_private      boolean not null default false,
  is_subscribed   boolean not null default false,
  wins            int not null default 0,
  losses          int not null default 0,
  total_wagered   numeric(10,2) not null default 0,
  follower_count  int not null default 0,
  following_count int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Wagers
-- ─────────────────────────────────────────────
create table if not exists wagers (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references profiles(id) on delete cascade,
  opponent_id     uuid references profiles(id) on delete set null,
  opponent_handle text not null,
  activity        text not null,
  amount          numeric(10,2) not null check (amount > 0),
  terms_text      text,
  status          wager_status not null default 'PENDING',
  winner_id       uuid references profiles(id) on delete set null,
  winner_handle   text,
  payment_method  payment_method,
  payment_handle  text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Feed posts
-- ─────────────────────────────────────────────
create table if not exists feed_posts (
  id            uuid primary key default gen_random_uuid(),
  wager_id      uuid not null references wagers(id) on delete cascade,
  type          text not null default 'challenge', -- challenge | active | settled | milestone
  is_public     boolean not null default true,
  reactions     jsonb not null default '{"fire":0,"hundred":0,"laughing":0,"shocked":0}'::jsonb,
  comment_count int not null default 0,
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Follows
-- ─────────────────────────────────────────────
create table if not exists follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ─────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────
create table if not exists notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  body         text not null,
  read         boolean not null default false,
  reference_id uuid,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists wagers_creator_id_idx      on wagers(creator_id);
create index if not exists wagers_opponent_handle_idx on wagers(opponent_handle);
create index if not exists wagers_status_idx          on wagers(status);
create index if not exists wagers_created_at_idx      on wagers(created_at desc);
create index if not exists feed_posts_wager_id_idx    on feed_posts(wager_id);
create index if not exists feed_posts_created_at_idx  on feed_posts(created_at desc);
create index if not exists follows_follower_idx       on follows(follower_id);
create index if not exists follows_following_idx      on follows(following_id);
create index if not exists notifications_user_id_idx  on notifications(user_id);
create index if not exists notifications_read_idx     on notifications(user_id, read);

-- ─────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create trigger wagers_updated_at before update on wagers
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- Follower count triggers
-- ─────────────────────────────────────────────
create or replace function update_follow_counts()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set follower_count  = follower_count  + 1 where id = new.following_id;
    update profiles set following_count = following_count + 1 where id = new.follower_id;
  elsif TG_OP = 'DELETE' then
    update profiles set follower_count  = greatest(follower_count  - 1, 0) where id = old.following_id;
    update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end;
$$;

create trigger follows_counts after insert or delete on follows
  for each row execute function update_follow_counts();

-- ─────────────────────────────────────────────
-- Wager settled trigger — update winner/loser stats
-- ─────────────────────────────────────────────
create or replace function handle_wager_settled()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'SETTLED' and old.status <> 'SETTLED' and new.winner_id is not null then
    -- Winner
    update profiles set
      wins          = wins + 1,
      total_wagered = total_wagered + new.amount
    where id = new.winner_id;
    -- Loser (the other participant)
    update profiles set
      losses        = losses + 1,
      total_wagered = total_wagered + new.amount
    where id <> new.winner_id
      and id in (new.creator_id, new.opponent_id);
  end if;
  return new;
end;
$$;

create trigger wagers_settled after update on wagers
  for each row when (new.status = 'SETTLED' and old.status <> 'SETTLED')
  execute function handle_wager_settled();

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
alter table profiles      enable row level security;
alter table wagers        enable row level security;
alter table feed_posts    enable row level security;
alter table follows       enable row level security;
alter table notifications enable row level security;

-- Profiles
create policy "Profiles are publicly readable"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Wagers
create policy "Public wagers are readable by anyone"
  on wagers for select using (
    is_public = true
    or creator_id = auth.uid()
    or opponent_id = auth.uid()
  );

create policy "Authenticated users can create wagers"
  on wagers for insert with check (
    auth.uid() = creator_id
  );

create policy "Participants can update their wager"
  on wagers for update using (
    auth.uid() = creator_id or auth.uid() = opponent_id
  );

-- Feed posts
create policy "Public feed posts readable by anyone"
  on feed_posts for select using (
    is_public = true
    or exists (
      select 1 from wagers w
      where w.id = feed_posts.wager_id
        and (w.creator_id = auth.uid() or w.opponent_id = auth.uid())
    )
  );

create policy "Wager creator can insert feed posts"
  on feed_posts for insert with check (
    exists (
      select 1 from wagers w
      where w.id = feed_posts.wager_id and w.creator_id = auth.uid()
    )
  );

create policy "Wager participants can update reactions"
  on feed_posts for update using (true);

-- Follows
create policy "Follows are publicly readable"
  on follows for select using (true);

create policy "Authenticated users can follow"
  on follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete using (auth.uid() = follower_id);

-- Notifications
create policy "Users can read their own notifications"
  on notifications for select using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update using (auth.uid() = user_id);

create policy "System can insert notifications"
  on notifications for insert with check (true);
