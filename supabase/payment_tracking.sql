-- Payment tracking: is_paid + paid_at columns on wagers
-- Run in Supabase SQL Editor

alter table wagers
  add column if not exists is_paid boolean not null default false;

alter table wagers
  add column if not exists paid_at timestamptz;

-- Index for the nudge function to quickly find unpaid settled wagers
create index if not exists wagers_unpaid_settled_idx
  on wagers (status, is_paid, updated_at)
  where status = 'SETTLED' and is_paid = false;
