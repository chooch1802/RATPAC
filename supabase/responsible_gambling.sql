-- Responsible gambling controls — run in Supabase SQL Editor

alter table profiles
  add column if not exists daily_wager_limit   numeric(10,2),
  add column if not exists weekly_wager_limit  numeric(10,2),
  add column if not exists monthly_wager_limit numeric(10,2),
  add column if not exists excluded_until      timestamptz;

-- Function to check current period wagered totals
create or replace function get_wagered_totals(p_user_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_daily   numeric;
  v_weekly  numeric;
  v_monthly numeric;
begin
  select coalesce(sum(amount), 0) into v_daily
  from wagers
  where creator_id = p_user_id
    and created_at >= now() - interval '1 day'
    and status not in ('VOIDED', 'EXPIRED');

  select coalesce(sum(amount), 0) into v_weekly
  from wagers
  where creator_id = p_user_id
    and created_at >= now() - interval '7 days'
    and status not in ('VOIDED', 'EXPIRED');

  select coalesce(sum(amount), 0) into v_monthly
  from wagers
  where creator_id = p_user_id
    and created_at >= now() - interval '30 days'
    and status not in ('VOIDED', 'EXPIRED');

  return jsonb_build_object(
    'daily', v_daily,
    'weekly', v_weekly,
    'monthly', v_monthly
  );
end;
$$;
