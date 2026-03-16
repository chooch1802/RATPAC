-- Influencer tracking & subscription event system
-- Run in Supabase SQL Editor AFTER referral_codes.sql

-- ─────────────────────────────────────────────
-- 1. Extend referral_codes with better controls
-- ─────────────────────────────────────────────
alter table referral_codes
  add column if not exists is_active     boolean not null default true,
  add column if not exists max_uses      int,                        -- null = unlimited
  add column if not exists discount_weeks int not null default 1,    -- weeks of free trial via Apple offer
  add column if not exists apple_offer_id text,                      -- matches App Store Connect offer ID
  add column if not exists notes         text;                       -- internal notes

-- ─────────────────────────────────────────────
-- 2. Subscription events table
--    Populated by RevenueCat webhook (send-push edge function or new webhook function)
-- ─────────────────────────────────────────────
create table if not exists subscription_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  event_type      text not null,        -- INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, TRIAL_STARTED, TRIAL_CONVERTED, BILLING_ISSUE
  revenue_cat_id  text,                 -- RevenueCat app_user_id
  product_id      text,                 -- e.g. com.ratpac.app.weekly
  price_usd       numeric(10,2),
  referral_code   text references referral_codes(code) on delete set null,
  raw_payload     jsonb,
  created_at      timestamptz not null default now()
);

alter table subscription_events enable row level security;
-- No user-facing RLS needed — only written by service_role via webhook

-- Index for dashboard queries
create index if not exists idx_sub_events_user      on subscription_events(user_id);
create index if not exists idx_sub_events_type      on subscription_events(event_type);
create index if not exists idx_sub_events_referral  on subscription_events(referral_code);
create index if not exists idx_sub_events_created   on subscription_events(created_at desc);

-- ─────────────────────────────────────────────
-- 3. Fix redeem_referral_code — attribution ONLY
--    Do NOT grant is_subscribed. The real subscription goes through Apple IAP.
--    Just store which code this user used so we can attribute conversions.
-- ─────────────────────────────────────────────
create or replace function redeem_referral_code(p_code text, p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_discount_weeks  int;
  v_apple_offer_id  text;
  v_max_uses        int;
  v_uses            int;
begin
  select discount_weeks, apple_offer_id, max_uses, uses
    into v_discount_weeks, v_apple_offer_id, v_max_uses, v_uses
  from referral_codes
  where code = upper(p_code)
    and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Invalid or expired code');
  end if;

  -- Enforce max_uses if set
  if v_max_uses is not null and v_uses >= v_max_uses then
    return jsonb_build_object('ok', false, 'message', 'This code has reached its limit');
  end if;

  -- Increment usage
  update referral_codes set uses = uses + 1 where code = upper(p_code);

  -- Store attribution on profile only — NO subscription grant
  update profiles set referral_code = upper(p_code)
  where id = p_user_id;

  return jsonb_build_object(
    'ok',              true,
    'discount_weeks',  v_discount_weeks,
    'apple_offer_id',  v_apple_offer_id
  );
end;
$$;

-- ─────────────────────────────────────────────
-- 4. Influencer attribution view — for your dashboard
-- ─────────────────────────────────────────────
create or replace view influencer_stats as
select
  rc.code,
  rc.influencer_name,
  rc.discount_weeks,
  rc.uses                                                           as total_signups,
  rc.max_uses,
  rc.is_active,
  count(se.id) filter (where se.event_type = 'INITIAL_PURCHASE')   as paid_conversions,
  count(se.id) filter (where se.event_type = 'TRIAL_STARTED')      as trials_started,
  count(se.id) filter (where se.event_type = 'TRIAL_CONVERTED')    as trials_converted,
  count(se.id) filter (where se.event_type = 'CANCELLATION')       as cancellations,
  round(
    count(se.id) filter (where se.event_type = 'INITIAL_PURCHASE')::numeric
    / nullif(rc.uses, 0) * 100, 1
  )                                                                 as conversion_pct,
  coalesce(sum(se.price_usd) filter (where se.event_type = 'RENEWAL'), 0) as total_revenue_usd,
  rc.created_at
from referral_codes rc
left join profiles p on p.referral_code = rc.code
left join subscription_events se on se.user_id = p.id
group by rc.code, rc.influencer_name, rc.discount_weeks, rc.uses, rc.max_uses, rc.is_active, rc.created_at
order by rc.uses desc;

-- ─────────────────────────────────────────────
-- 5. Update starter codes with new columns
-- ─────────────────────────────────────────────
insert into referral_codes (code, influencer_name, discount_weeks, is_active, notes) values
  ('RATPAC',  'General launch',    1, true, 'General launch code'),
  ('JAKE10',  'Jake (TikTok)',     2, true, 'TikTok golf content'),
  ('KYLIE',   'Kylie (Instagram)', 3, true, 'Instagram lifestyle'),
  ('EMMA25',  'Emma (Instagram)',  2, true, 'Instagram sports'),
  ('SPORTS',  'Sports accounts',   1, true, 'General sports')
on conflict (code) do update set
  discount_weeks = excluded.discount_weeks,
  is_active      = excluded.is_active,
  notes          = excluded.notes;
