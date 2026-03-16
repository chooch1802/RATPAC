-- Age verification fields — run in Supabase SQL Editor

alter table profiles
  add column if not exists dob              date,
  add column if not exists age_verified     boolean not null default false,
  add column if not exists terms_accepted_at timestamptz;
