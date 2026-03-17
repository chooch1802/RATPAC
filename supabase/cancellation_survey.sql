-- Cancellation survey responses
-- Run in Supabase SQL Editor

create table if not exists cancellation_surveys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table cancellation_surveys enable row level security;

-- Users can only insert their own responses
create policy "Users can log their own cancellation reason"
  on cancellation_surveys for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admins view via service role (no select policy needed for app users)
