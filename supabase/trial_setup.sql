-- 7-day Pro trial on signup
-- Run in Supabase SQL Editor

alter table profiles
  add column if not exists trial_ends_at timestamptz;

-- Give existing users who signed up in the last 30 days a trial
-- (remove this block if you don't want to backfill existing users)
update profiles
  set trial_ends_at = now() + interval '7 days'
  where trial_ends_at is null
    and created_at > now() - interval '30 days';
