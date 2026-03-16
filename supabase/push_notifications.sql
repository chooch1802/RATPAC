-- Push notification device tokens — run in Supabase SQL Editor

create table if not exists device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'ios', -- ios | android
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists device_tokens_user_id_idx on device_tokens(user_id);

alter table device_tokens enable row level security;

create policy "Users can manage their own tokens"
  on device_tokens for all using (auth.uid() = user_id);
