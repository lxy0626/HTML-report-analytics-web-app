-- MT4 Strategy Tester Report Tracker — schema, RLS policies, storage bucket.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id                             uuid primary key default gen_random_uuid(),
  user_id                        uuid not null references auth.users (id) on delete cascade,
  uploaded_at                    timestamptz not null default now(),
  file_name                      text not null,
  storage_path                   text not null,
  tag                            text,
  notes                          text,

  ea_name                        text,
  broker                         text,
  build                          text,
  symbol                         text,
  timeframe                      text,
  model                          text,
  test_start                     date,
  test_end                       date,
  initial_deposit                numeric,
  spread                         text,

  parameters_raw                 text,
  parameters                     jsonb,

  net_profit                     numeric,
  gross_profit                   numeric,
  gross_loss                     numeric,
  profit_factor                  numeric,
  expected_payoff                numeric,
  absolute_drawdown              numeric,
  max_drawdown                   numeric,
  max_drawdown_pct               numeric,
  relative_drawdown_pct          numeric,
  relative_drawdown              numeric,

  total_trades                   integer,
  short_trades                   integer,
  short_win_pct                  numeric,
  long_trades                    integer,
  long_win_pct                   numeric,
  profit_trades                  integer,
  profit_trades_pct              numeric,
  loss_trades                    integer,
  loss_trades_pct                numeric,

  largest_profit_trade           numeric,
  largest_loss_trade             numeric,
  average_profit_trade           numeric,
  average_loss_trade             numeric,

  max_consecutive_wins           integer,
  max_consecutive_wins_money     numeric,
  max_consecutive_losses         integer,
  max_consecutive_losses_money   numeric,
  avg_consecutive_wins           numeric,
  avg_consecutive_losses         numeric,

  trades                         jsonb not null default '[]'::jsonb
);

-- Added later for the script-diff + AI summary feature. `alter table ... add column if not
-- exists` is idempotent, so this is safe to re-run against a database that already has the
-- base reports table (as well as a brand-new one from the create table above).
alter table public.reports add column if not exists script_source text;
alter table public.reports add column if not exists ai_summary text;
alter table public.reports add column if not exists ai_summary_generated_at timestamptz;

create index if not exists reports_user_id_uploaded_at_idx
  on public.reports (user_id, uploaded_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);

-- Private storage bucket for the original uploaded .htm files.
insert into storage.buckets (id, name, public)
values ('reports-raw', 'reports-raw', false)
on conflict (id) do nothing;

-- Objects are stored at "{user_id}/{report_id}.htm" — restrict access to the
-- owning user's folder (first path segment) only.
drop policy if exists "reports_raw_select_own" on storage.objects;
create policy "reports_raw_select_own" on storage.objects
  for select using (
    bucket_id = 'reports-raw'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reports_raw_insert_own" on storage.objects;
create policy "reports_raw_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'reports-raw'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "reports_raw_delete_own" on storage.objects;
create policy "reports_raw_delete_own" on storage.objects
  for delete using (
    bucket_id = 'reports-raw'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- After running this file:
-- 1. Go to Authentication → Providers → Email and disable "Allow new users to sign up"
--    (or, on newer Supabase dashboards: Authentication → Sign In / Providers → Email →
--    turn off "Enable sign ups"). This is a single-user app; you'll create the one
--    account yourself in the next step.
-- 2. Go to Authentication → Users → Add user → create your own email/password login.
