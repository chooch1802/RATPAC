-- Referral codes — run this in Supabase SQL Editor after schema.sql

-- ─────────────────────────────────────────────
-- Referral codes table
-- ─────────────────────────────────────────────
create table if not exists referral_codes (
  code            text primary key,
  influencer_name text not null,
  free_months     int not null default 1,
  uses            int not null default 0,
  created_at      timestamptz not null default now()
);

-- Add referral fields to profiles
alter table profiles
  add column if not exists referral_code  text references referral_codes(code) on delete set null,
  add column if not exists trial_ends_at  timestamptz;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table referral_codes enable row level security;

create policy "Referral codes are publicly readable"
  on referral_codes for select using (true);

-- ─────────────────────────────────────────────
-- Redeem function — atomically validates, increments, and grants trial
-- ─────────────────────────────────────────────
create or replace function redeem_referral_code(p_code text, p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_months int;
  v_trial_end timestamptz;
begin
  select free_months into v_months
  from referral_codes
  where code = upper(p_code);

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid code');
  end if;

  -- Increment usage
  update referral_codes set uses = uses + 1 where code = upper(p_code);

  -- Grant trial on profile
  v_trial_end := now() + (v_months || ' months')::interval;

  update profiles set
    referral_code  = upper(p_code),
    is_subscribed  = true,
    trial_ends_at  = v_trial_end
  where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'free_months', v_months,
    'trial_ends_at', v_trial_end
  );
end;
$$;

-- ─────────────────────────────────────────────
-- Trial expiry check — call this on app open to expire stale trials
-- ─────────────────────────────────────────────
create or replace function expire_trials()
returns void language plpgsql security definer as $$
begin
  update profiles set is_subscribed = false
  where trial_ends_at is not null
    and trial_ends_at < now()
    and is_subscribed = true;
end;
$$;

-- ─────────────────────────────────────────────
-- Starter codes
-- ─────────────────────────────────────────────
insert into referral_codes (code, influencer_name, free_months) values
  ('RATPAC',  'General launch',   1),
  ('JAKE10',  'Jake (TikTok)',    2),
  ('KYLIE',   'Kylie (Instagram)',3),
  ('EMMA25',  'Emma (Instagram)', 2),
  ('SPORTS',  'Sports accounts',  1)
on conflict (code) do nothing;
