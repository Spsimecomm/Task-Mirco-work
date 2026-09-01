-- ============================================================================
-- TASKLY - COMPLETE PRODUCTION-READY SUPABASE DATABASE SCHEMA & BACKEND RPCs
-- ============================================================================
-- 1. Strict User Role Preservation (Worker / Employer / Admin) on Signup
-- 2. Employer Deposit Requests & Admin Approval Flow with Balance Crediting
-- 3. Atomic Escrow Funding, Proof Submission, and Approval / Refund Engine
-- 4. Idempotent 5% Referral Commission Engine for Workers
-- 5. Open & Flexible Marketplace Task Browsing with Zero RLS Bottlenecks
-- 6. Full Realtime Sync, Cascading Foreign Keys, and Safe Non-Negative Constraints
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. CORE TABLE DEFINITIONS
-- ----------------------------------------------------------------------------

-- A. Profiles (Worker / Employer / Admin)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New User',
  role text not null default 'worker',
  referral_code text unique,
  referred_by uuid references public.profiles(id) on delete set null,
  earnings numeric(12,2) not null default 0.00,
  pending numeric(12,2) not null default 0.00,
  spent numeric(12,2) not null default 0.00,
  deposited numeric(12,2) not null default 0.00,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- B. Tasks
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  category text default 'Micro Task',
  description text not null default '',
  proof_instructions text default 'Provide proof of completion',
  reward numeric(12,2) not null default 0.50,
  max_workers int not null default 1,
  slots_total int not null default 1,
  slots_filled int not null default 0,
  time_limit_minutes int not null default 60,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- C. Submissions
create table if not exists public.submissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  worker_name text,
  proof text not null default '',
  proof_text text,
  proof_url text,
  proof_file_url text,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(task_id, worker_id)
);

-- D. Referral Commissions Ledger (Idempotent per source)
create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'task_approval',
  source_id uuid not null,
  eligible_amount numeric(12,2) not null default 0.00,
  commission_rate numeric(5,2) not null default 5.00,
  commission_amount numeric(12,2) not null default 0.00,
  status text not null default 'completed',
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(source_type, source_id, referrer_id)
);

-- E. Platform Commission Earnings Ledger
create table if not exists public.platform_earnings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  reward_amount numeric(12,2) not null,
  commission_rate numeric(5,2) not null default 10.00,
  commission_amount numeric(12,2) not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- F. Withdrawals
create table if not exists public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  method text not null default 'bKash',
  account_number text,
  account_details text,
  amount numeric(12,2) not null default 0.00,
  fee_amount numeric(12,2) not null default 0.00,
  net_amount numeric(12,2) not null default 0.00,
  status text not null default 'pending',
  rejection_reason text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- G. Withdrawal Processing Fee Earnings
create table if not exists public.withdrawal_fee_earnings (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawals(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  withdrawal_amount numeric(12,2) not null,
  fee_rate numeric(5,2) not null default 2.00,
  fee_amount numeric(12,2) not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- H. Financial Transactions Ledger
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'deposit',
  amount numeric(12,2) not null default 0.00,
  status text not null default 'completed',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- I. Deposit Requests
create table if not exists public.deposit_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  employer_id uuid references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null default 0.00,
  method text not null default 'bkash',
  payment_method text not null default 'bkash',
  trx_id text not null default '',
  transaction_id text not null default '',
  sender_mobile text not null default '',
  sender_number text not null default '',
  status text not null default 'pending',
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- J. Notifications System
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null default '',
  message text not null default '',
  type text not null default 'announcement',
  target_role text not null default 'all',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default timezone('utc'::text, now()),
  primary key (notification_id, user_id)
);

-- K. System Settings
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  label text,
  description text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.system_settings (key, value, label, description)
values
  ('referral_commission_rate', '5.00', 'Referral Commission Rate (%)', 'Worker referral commission percentage.'),
  ('platform_commission_rate', '10.00', 'Platform Task Commission Rate (%)', 'Platform fee percentage charged on tasks.'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal Processing Fee (%)', 'Worker withdrawal processing fee percentage.')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 3. ENSURE COLUMNS & SYNC LEGACY FIELDS
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists full_name text default 'New User',
  add column if not exists role text default 'worker',
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists earnings numeric(12,2) not null default 0.00,
  add column if not exists pending numeric(12,2) not null default 0.00,
  add column if not exists spent numeric(12,2) not null default 0.00,
  add column if not exists deposited numeric(12,2) not null default 0.00,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table public.tasks
  add column if not exists employer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists title text not null default '',
  add column if not exists category text default 'Micro Task',
  add column if not exists description text not null default '',
  add column if not exists proof_instructions text default 'Provide proof of completion',
  add column if not exists reward numeric(12,2) not null default 0.50,
  add column if not exists max_workers int not null default 1,
  add column if not exists slots_total int not null default 1,
  add column if not exists slots_filled int not null default 0,
  add column if not exists time_limit_minutes int not null default 60,
  add column if not exists status text not null default 'open',
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table public.submissions
  add column if not exists task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists worker_id uuid references public.profiles(id) on delete cascade,
  add column if not exists employer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists worker_name text,
  add column if not exists proof text default '',
  add column if not exists proof_text text,
  add column if not exists proof_url text,
  add column if not exists proof_file_url text,
  add column if not exists status text not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table public.withdrawals
  add column if not exists worker_id uuid references public.profiles(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists method text not null default 'bKash',
  add column if not exists amount numeric(12,2) not null default 0.00,
  add column if not exists fee_amount numeric(12,2) not null default 0.00,
  add column if not exists net_amount numeric(12,2) not null default 0.00,
  add column if not exists account_number text,
  add column if not exists account_details text,
  add column if not exists status text not null default 'pending',
  add column if not exists rejection_reason text,
  add column if not exists admin_notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

alter table public.transactions
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists type text not null default 'deposit',
  add column if not exists amount numeric(12,2) not null default 0.00,
  add column if not exists status text not null default 'completed',
  add column if not exists meta jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.deposit_requests
  add column if not exists employer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric(12,2) not null default 0.00,
  add column if not exists method text,
  add column if not exists payment_method text,
  add column if not exists sender_mobile text,
  add column if not exists sender_number text,
  add column if not exists trx_id text,
  add column if not exists transaction_id text,
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists admin_notes text,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.notifications
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists title text not null default '',
  add column if not exists message text not null default '',
  add column if not exists type text not null default 'announcement',
  add column if not exists target_role text not null default 'all',
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.notification_reads
  add column if not exists notification_id uuid references public.notifications(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists read_at timestamptz not null default timezone('utc'::text, now());

alter table public.referral_commissions
  add column if not exists referrer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists referred_id uuid references public.profiles(id) on delete cascade,
  add column if not exists source_type text not null default 'task_approval',
  add column if not exists source_id uuid,
  add column if not exists eligible_amount numeric(12,2) not null default 0.00,
  add column if not exists commission_rate numeric(5,2) not null default 5.00,
  add column if not exists commission_amount numeric(12,2) not null default 0.00,
  add column if not exists status text not null default 'completed',
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

update public.deposit_requests
set employer_id = coalesce(employer_id, user_id),
    user_id = coalesce(user_id, employer_id),
    method = coalesce(method, payment_method, 'bkash'),
    payment_method = coalesce(payment_method, method, 'bkash'),
    sender_mobile = coalesce(sender_mobile, sender_number, ''),
    sender_number = coalesce(sender_number, sender_mobile, ''),
    trx_id = coalesce(trx_id, transaction_id, ''),
    transaction_id = coalesce(transaction_id, trx_id, '')
where employer_id is null or user_id is null;

update public.tasks set employer_id = coalesce(employer_id, user_id) where employer_id is null;
update public.submissions set worker_id = coalesce(worker_id, user_id) where worker_id is null;
update public.withdrawals set worker_id = coalesce(worker_id, user_id) where worker_id is null;

-- ----------------------------------------------------------------------------
-- 4. CLEAN CONSTRAINTS & INDEXES (100% IDEMPOTENT)
-- ----------------------------------------------------------------------------
-- Explicitly drop existing check constraints to prevent ERROR 42710 (constraint already exists)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_earnings_check;
alter table public.profiles drop constraint if exists profiles_pending_check;
alter table public.profiles drop constraint if exists profiles_spent_check;
alter table public.profiles drop constraint if exists profiles_deposited_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('worker', 'employer', 'admin')),
  add constraint profiles_earnings_check check (earnings >= 0),
  add constraint profiles_pending_check check (pending >= 0),
  add constraint profiles_spent_check check (spent >= 0),
  add constraint profiles_deposited_check check (deposited >= 0);

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop constraint if exists tasks_reward_check;
alter table public.tasks drop constraint if exists tasks_max_workers_check;
alter table public.tasks drop constraint if exists tasks_slots_total_check;
alter table public.tasks drop constraint if exists tasks_slots_filled_check;

alter table public.tasks
  add constraint tasks_status_check check (status in ('open', 'completed', 'cancelled', 'closed', 'active', 'paused', 'in_progress', 'draft', 'pending')),
  add constraint tasks_reward_check check (reward >= 0),
  add constraint tasks_max_workers_check check (max_workers > 0),
  add constraint tasks_slots_total_check check (slots_total > 0),
  add constraint tasks_slots_filled_check check (slots_filled >= 0);

alter table public.submissions drop constraint if exists submissions_status_check;
alter table public.submissions
  add constraint submissions_status_check check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

alter table public.referral_commissions drop constraint if exists referral_commissions_amount_check;
alter table public.referral_commissions drop constraint if exists referral_commissions_status_check;
alter table public.referral_commissions
  add constraint referral_commissions_amount_check check (commission_amount >= 0),
  add constraint referral_commissions_status_check check (status in ('completed', 'cancelled', 'pending', 'paid'));

alter table public.withdrawals drop constraint if exists withdrawals_status_check;
alter table public.withdrawals drop constraint if exists withdrawals_amount_check;
alter table public.withdrawals
  add constraint withdrawals_status_check check (status in ('pending', 'completed', 'rejected', 'approved', 'cancelled')),
  add constraint withdrawals_amount_check check (amount > 0);

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions drop constraint if exists transactions_amount_check;
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_type_check check (type in ('deposit', 'earning', 'withdrawal', 'escrow_hold', 'escrow_release', 'escrow_refund', 'admin_adjustment', 'spend', 'commission', 'fee', 'referral')),
  add constraint transactions_amount_check check (amount >= 0),
  add constraint transactions_status_check check (status in ('pending', 'completed', 'rejected', 'failed', 'approved'));

-- Performance indexes
create unique index if not exists idx_profiles_referral_code_upper on public.profiles (upper(referral_code)) where referral_code is not null;
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create index if not exists idx_tasks_employer_id on public.tasks(employer_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_submissions_task_id on public.submissions(task_id);
create index if not exists idx_submissions_worker_id on public.submissions(worker_id);
create index if not exists idx_submissions_employer_id on public.submissions(employer_id);
create index if not exists idx_deposit_requests_employer on public.deposit_requests(employer_id);
create index if not exists idx_deposit_requests_status on public.deposit_requests(status);
create index if not exists idx_withdrawals_worker on public.withdrawals(worker_id);
create index if not exists idx_withdrawals_status on public.withdrawals(status);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- ----------------------------------------------------------------------------
-- 5. BUSINESS LOGIC & RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- A. Referral Code Generator for Workers
create or replace function public.generate_unique_referral_code(p_full_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
  v_attempts int := 0;
begin
  v_prefix := upper(substring(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z]', '', 'g') from 1 for 4));
  if length(v_prefix) < 3 then
    v_prefix := 'WORK';
  end if;

  loop
    v_code := v_prefix || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
    if not exists (select 1 from public.profiles where upper(referral_code) = v_code) then
      return v_code;
    end if;
    v_attempts := v_attempts + 1;
    if v_attempts > 30 then
      return 'WRK' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
    end if;
  end loop;
end;
$$;

-- B. Handle User Registration (Strict Role Preservation from Metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_full_name text;
  v_ref_code text;
  v_referrer_id uuid := null;
  v_my_ref_code text := null;
begin
  -- 1. Extract Role directly from metadata (strictly respects user selection)
  v_role := lower(trim(coalesce(
    new.raw_user_meta_data->>'role',
    new.raw_app_meta_data->>'role',
    'worker'
  )));
  if v_role not in ('worker', 'employer', 'admin') then
    v_role := 'worker';
  end if;

  -- 2. Extract Full Name safely
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'New User'
  );
  if trim(v_full_name) = '' then
    v_full_name := 'New User';
  end if;

  -- 3. If worker, handle referral code generation & referrer lookup
  if v_role = 'worker' then
    v_ref_code := upper(btrim(coalesce(
      new.raw_user_meta_data->>'referral_code',
      new.raw_user_meta_data->>'ref',
      new.raw_user_meta_data->>'referred_by',
      ''
    )));

    if v_ref_code <> '' then
      select id into v_referrer_id
      from public.profiles
      where role = 'worker' and upper(referral_code) = v_ref_code and id <> new.id
      limit 1;
    end if;

    v_my_ref_code := public.generate_unique_referral_code(v_full_name);
  else
    v_referrer_id := null;
    v_my_ref_code := null;
  end if;

  -- 4. Upsert profile safely without overwriting existing role
  insert into public.profiles (
    id, full_name, role, referral_code, referred_by,
    earnings, pending, spent, deposited, created_at, updated_at
  )
  values (
    new.id, v_full_name, v_role, v_my_ref_code, v_referrer_id,
    0.00, 0.00, 0.00, 0.00, timezone('utc'::text, now()), timezone('utc'::text, now())
  )
  on conflict (id) do update set
    full_name = coalesce(nullif(excluded.full_name, 'New User'), public.profiles.full_name),
    role = case
      when public.profiles.role in ('worker', 'employer', 'admin') then public.profiles.role
      else excluded.role
    end,
    referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
    referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
    updated_at = timezone('utc'::text, now());

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Drop previous conflicting submission trigger to prevent double payout bugs
drop trigger if exists trg_submission_status_change on public.submissions;
drop function if exists public.handle_submission_status_change();

-- C. 5% Referral Commission Calculation Engine (Idempotent & Worker-Only)
drop function if exists public.process_referral_commission(uuid, text, uuid, numeric, numeric);
drop function if exists public.process_referral_commission(uuid, text, uuid, numeric);

create or replace function public.process_referral_commission(
  p_referred_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_eligible_amount numeric,
  p_rate numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_referrer_role text;
  v_rate numeric(5,2);
  v_commission numeric(12,2);
  v_comm_id uuid;
  v_setting text;
begin
  if p_eligible_amount is null or p_eligible_amount <= 0 then
    return null;
  end if;

  -- 1. Find referred worker profile and referrer
  select referred_by into v_referrer_id
  from public.profiles
  where id = p_referred_id and role = 'worker';

  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return null;
  end if;

  -- 2. Verify referrer is also a worker
  select role into v_referrer_role
  from public.profiles
  where id = v_referrer_id
  for update;

  if v_referrer_role is distinct from 'worker' then
    return null;
  end if;

  -- 3. Determine commission rate (default 5%)
  if p_rate is not null and p_rate >= 0 then
    v_rate := p_rate;
  else
    select value into v_setting from public.system_settings where key = 'referral_commission_rate';
    v_rate := coalesce(nullif(v_setting, '')::numeric, 5.00);
  end if;

  v_rate := greatest(0, least(v_rate, 100));
  v_commission := round((p_eligible_amount * v_rate / 100.00)::numeric, 2);
  if v_commission <= 0.00 then
    v_commission := 0.01;
  end if;

  -- 4. Idempotent insertion
  begin
    insert into public.referral_commissions (
      referrer_id, referred_id, source_type, source_id,
      eligible_amount, commission_rate, commission_amount, status, created_at
    )
    values (
      v_referrer_id, p_referred_id, p_source_type, p_source_id,
      p_eligible_amount, v_rate, v_commission, 'completed', timezone('utc'::text, now())
    )
    returning id into v_comm_id;
  exception when unique_violation then
    return null;
  end;

  -- 5. Credit referrer earnings
  update public.profiles
  set earnings = earnings + v_commission,
      updated_at = timezone('utc'::text, now())
  where id = v_referrer_id;

  -- 6. Log transaction
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_referrer_id, 'earning', v_commission, 'completed',
    jsonb_build_object(
      'source', 'referral_commission',
      'referral_commission_id', v_comm_id,
      'referred_user_id', p_referred_id,
      'source_type', p_source_type,
      'source_id', p_source_id,
      'commission_rate', v_rate
    ),
    timezone('utc'::text, now())
  );

  -- 7. Notify referrer
  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (
    v_referrer_id,
    'Referral Bonus Earned! 🎉',
    format('You earned $%s (%s%% commission) from your referred worker.', to_char(v_commission, 'FM999,990.00'), v_rate),
    'commission', 'worker', timezone('utc'::text, now())
  );

  return v_comm_id;
exception when others then
  return null;
end;
$$;

-- D. Create Task with Escrow Funding (Deducts Deposited, Adds to Pending Escrow)
create or replace function public.create_task_with_funding(
  p_title text,
  p_category text,
  p_description text,
  p_proof_instructions text,
  p_reward numeric,
  p_max_workers int default 1,
  p_time_limit_minutes int default 60,
  p_slots int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_slots_count int;
  v_total_cost numeric(12,2);
  v_user_deposited numeric(12,2);
  v_new_task_id uuid;
begin
  if v_caller_id is null then raise exception 'Authentication required.'; end if;
  v_slots_count := greatest(coalesce(p_slots, p_max_workers, 1), 1);
  if p_reward <= 0 then raise exception 'Reward must be greater than zero.'; end if;
  v_total_cost := round((p_reward * v_slots_count)::numeric, 2);

  select deposited into v_user_deposited
  from public.profiles
  where id = v_caller_id
  for update;

  if v_user_deposited is null or v_user_deposited < v_total_cost then
    raise exception 'Insufficient deposited balance ($% needed, $% available). Please deposit funds first.',
      to_char(v_total_cost, 'FM999,990.00'), to_char(coalesce(v_user_deposited, 0), 'FM999,990.00');
  end if;

  -- 1. Deduct deposited and put in pending escrow
  update public.profiles
  set deposited = deposited - v_total_cost,
      pending = pending + v_total_cost,
      updated_at = timezone('utc'::text, now())
  where id = v_caller_id;

  -- 2. Insert task
  insert into public.tasks (
    employer_id, title, category, description, proof_instructions,
    reward, max_workers, slots_total, slots_filled, time_limit_minutes, status, created_at, updated_at
  )
  values (
    v_caller_id, p_title, coalesce(p_category, 'Micro Task'), p_description, p_proof_instructions,
    p_reward, v_slots_count, v_slots_count, 0, greatest(coalesce(p_time_limit_minutes, 60), 1),
    'open', timezone('utc'::text, now()), timezone('utc'::text, now())
  )
  returning id into v_new_task_id;

  -- 3. Record transaction
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_caller_id, 'escrow_hold', v_total_cost, 'completed',
    jsonb_build_object('task_id', v_new_task_id, 'reward', p_reward, 'slots', v_slots_count, 'title', p_title),
    timezone('utc'::text, now())
  );

  return v_new_task_id;
end;
$$;

-- E. Task Proof Submission
create or replace function public.submit_task_proof(
  p_task_id uuid,
  p_proof_text text,
  p_proof_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_role text;
  v_name text;
  v_task public.tasks%rowtype;
  v_sub_id uuid;
begin
  if v_worker_id is null then raise exception 'Authentication required.'; end if;
  select role, full_name into v_role, v_name from public.profiles where id = v_worker_id;
  if v_role is distinct from 'worker' then raise exception 'Only workers can submit proof.'; end if;
  if p_proof_text is null or btrim(p_proof_text) = '' then raise exception 'Proof details are required.'; end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or v_task.status not in ('open', 'active') then
    raise exception 'This task is no longer accepting submissions.';
  end if;
  if v_task.employer_id = v_worker_id then
    raise exception 'You cannot submit work on your own task.';
  end if;
  if coalesce(v_task.slots_filled, 0) >= coalesce(v_task.slots_total, v_task.max_workers, 1) then
    raise exception 'This task has no remaining slots.';
  end if;

  -- 1. Insert submission
  insert into public.submissions (
    task_id, worker_id, employer_id, worker_name, proof, proof_text, proof_url, proof_file_url, status, created_at, updated_at
  )
  values (
    p_task_id, v_worker_id, v_task.employer_id, coalesce(v_name, 'Worker'),
    p_proof_text, p_proof_text, nullif(btrim(p_proof_url), ''), nullif(btrim(p_proof_url), ''), 'pending',
    timezone('utc'::text, now()), timezone('utc'::text, now())
  )
  returning id into v_sub_id;

  -- 2. Update task slots filled
  update public.tasks
  set slots_filled = slots_filled + 1,
      status = case when slots_filled + 1 >= slots_total then 'closed' else status end,
      updated_at = timezone('utc'::text, now())
  where id = p_task_id;

  -- 3. Increase worker pending balance
  update public.profiles
  set pending = pending + v_task.reward,
      updated_at = timezone('utc'::text, now())
  where id = v_worker_id;

  return v_sub_id;
exception when unique_violation then
  raise exception 'You have already submitted proof for this task.';
end;
$$;

-- F. Approve Submission & Payout (Atomic Single-Path Execution)
create or replace function public.approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_task public.tasks%rowtype;
  v_caller_role text;
  v_rate numeric(5,2);
  v_setting text;
  v_commission numeric(12,2);
  v_worker_payout numeric(12,2);
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role not in ('employer', 'admin') then
    raise exception 'Only the task employer or an admin can approve submissions.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if v_sub.status <> 'pending' then raise exception 'This submission has already been reviewed.'; end if;
  if v_caller_role <> 'admin' and v_sub.employer_id <> auth.uid() then
    raise exception 'Not authorized to review this submission.';
  end if;

  select * into v_task from public.tasks where id = v_sub.task_id for update;
  if not found then raise exception 'Task not found.'; end if;

  -- Platform commission calculation (default 10%)
  select value into v_setting from public.system_settings where key = 'platform_commission_rate';
  v_rate := greatest(0, least(coalesce(nullif(v_setting, '')::numeric, 10.00), 100));
  v_commission := round((v_task.reward * v_rate / 100.00)::numeric, 2);
  v_worker_payout := greatest(v_task.reward - v_commission, 0);

  -- 1. Mark submission approved
  update public.submissions
  set status = 'approved', reviewed_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- 2. Credit worker earnings and deduct pending
  update public.profiles
  set earnings = earnings + v_worker_payout,
      pending = greatest(pending - v_task.reward, 0),
      updated_at = timezone('utc'::text, now())
  where id = v_sub.worker_id;

  -- 3. Deduct employer escrow pending and add to spent
  update public.profiles
  set pending = greatest(pending - v_task.reward, 0),
      spent = spent + v_task.reward,
      updated_at = timezone('utc'::text, now())
  where id = v_sub.employer_id;

  -- 4. Record platform earnings
  insert into public.platform_earnings (submission_id, task_id, worker_id, employer_id, reward_amount, commission_rate, commission_amount, created_at)
  values (p_submission_id, v_sub.task_id, v_sub.worker_id, v_sub.employer_id, v_task.reward, v_rate, v_commission, timezone('utc'::text, now()))
  on conflict do nothing;

  -- 5. Record financial transactions
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values
    (v_sub.worker_id, 'earning', v_worker_payout, 'completed', jsonb_build_object('submission_id', p_submission_id, 'task_id', v_sub.task_id, 'commission', v_commission), timezone('utc'::text, now())),
    (v_sub.employer_id, 'spend', v_task.reward, 'completed', jsonb_build_object('submission_id', p_submission_id, 'task_id', v_sub.task_id), timezone('utc'::text, now()));

  -- 6. Trigger referral commission for referrer
  perform public.process_referral_commission(v_sub.worker_id, 'task_approval', p_submission_id, v_task.reward, null);

  -- 7. Notify worker
  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (
    v_sub.worker_id,
    'Task Approved! 💰',
    format('Your submission for "%s" was approved. $%s has been added to your earnings.', v_task.title, to_char(v_worker_payout, 'FM999,990.00')),
    'reward', 'worker', timezone('utc'::text, now())
  );
end;
$$;

create or replace function public.approve_submission_and_pay(p_submission_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin perform public.approve_submission(p_submission_id); end;
$$;

-- G. Reject Submission & Refund Employer Escrow
create or replace function public.reject_submission(p_submission_id uuid, p_reason text default 'Rejected by employer')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_task public.tasks%rowtype;
  v_role text;
  v_reason text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('employer', 'admin') then
    raise exception 'Only the task employer or an admin can reject submissions.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if v_sub.status <> 'pending' then raise exception 'This submission has already been reviewed.'; end if;
  if v_role <> 'admin' and v_sub.employer_id <> auth.uid() then
    raise exception 'Not authorized to review this submission.';
  end if;

  select * into v_task from public.tasks where id = v_sub.task_id for update;
  if not found then raise exception 'Task not found.'; end if;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'Rejected by employer');

  -- 1. Mark submission rejected
  update public.submissions
  set status = 'rejected', rejection_reason = v_reason, reviewed_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- 2. Worker pending release
  update public.profiles
  set pending = greatest(pending - v_task.reward, 0), updated_at = timezone('utc'::text, now())
  where id = v_sub.worker_id;

  -- 3. Employer escrow refund (pending -> deposited)
  update public.profiles
  set pending = greatest(pending - v_task.reward, 0),
      deposited = deposited + v_task.reward,
      updated_at = timezone('utc'::text, now())
  where id = v_sub.employer_id;

  -- 4. Reopen slot on task
  update public.tasks
  set slots_filled = greatest(slots_filled - 1, 0), status = 'open', updated_at = timezone('utc'::text, now())
  where id = v_sub.task_id;

  -- 5. Record refund transaction
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_sub.employer_id, 'escrow_refund', v_task.reward, 'completed',
    jsonb_build_object('submission_id', p_submission_id, 'task_id', v_sub.task_id, 'reason', v_reason),
    timezone('utc'::text, now())
  );

  -- 6. Notify worker
  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (
    v_sub.worker_id,
    'Submission Rejected',
    format('Your submission for "%s" was rejected: %s', coalesce(v_task.title, 'Task'), v_reason),
    'alert', 'worker', timezone('utc'::text, now())
  );
end;
$$;

create or replace function public.reject_submission_and_refund(p_submission_id uuid, p_reason text default 'Rejected by employer')
returns void language plpgsql security definer set search_path = public as $$
begin perform public.reject_submission(p_submission_id, p_reason); end;
$$;

-- H. Deposit Request & Admin Review RPCs
create or replace function public.request_deposit(p_amount numeric, p_method text, p_sender_mobile text, p_trx_id text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'employer' and v_role is distinct from 'admin' then
    raise exception 'Only employers can request deposits.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero.';
  end if;
  if lower(trim(p_method)) not in ('bkash', 'nagad') then
    raise exception 'Payment method must be bKash or Nagad.';
  end if;
  if btrim(coalesce(p_sender_mobile, '')) = '' then
    raise exception 'Sender mobile number is required.';
  end if;
  if btrim(coalesce(p_trx_id, '')) = '' then
    raise exception 'Transaction ID is required.';
  end if;
  if exists(select 1 from public.deposit_requests where lower(coalesce(trx_id, transaction_id, '')) = lower(btrim(p_trx_id))) then
    raise exception 'This transaction ID has already been submitted.';
  end if;

  insert into public.deposit_requests (
    employer_id, user_id, amount, method, payment_method,
    sender_mobile, sender_number, trx_id, transaction_id, status, created_at
  )
  values (
    auth.uid(), auth.uid(), p_amount, lower(trim(p_method)), lower(trim(p_method)),
    btrim(p_sender_mobile), btrim(p_sender_mobile), btrim(p_trx_id), btrim(p_trx_id),
    'pending', timezone('utc'::text, now())
  )
  returning id into v_id;

  return v_id;
end; $$;

create or replace function public.admin_approve_deposit(p_deposit_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_dep public.deposit_requests%rowtype;
  v_role text;
  v_target_user_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can approve deposits.';
  end if;
  select * into v_dep from public.deposit_requests where id = p_deposit_id for update;
  if not found then
    raise exception 'Deposit request not found.';
  end if;
  if v_dep.status <> 'pending' then
    raise exception 'This deposit has already been reviewed.';
  end if;

  v_target_user_id := coalesce(v_dep.employer_id, v_dep.user_id);
  if v_target_user_id is null then
    raise exception 'No user associated with this deposit request.';
  end if;

  -- 1. Mark deposit approved
  update public.deposit_requests
  set status = 'approved',
      reviewed_at = timezone('utc'::text, now()),
      reviewed_by = auth.uid()
  where id = p_deposit_id;

  -- 2. Credit employer deposited balance
  update public.profiles
  set deposited = deposited + v_dep.amount,
      updated_at = timezone('utc'::text, now())
  where id = v_target_user_id;
  
  -- 3. Record transaction
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_target_user_id, 'deposit', v_dep.amount, 'completed',
    jsonb_build_object(
      'deposit_request_id', p_deposit_id,
      'method', coalesce(v_dep.method, v_dep.payment_method),
      'trx_id', coalesce(v_dep.trx_id, v_dep.transaction_id)
    ),
    timezone('utc'::text, now())
  );

  -- 4. Notify employer
  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (
    v_target_user_id,
    'Deposit Approved! 💳',
    format('Your deposit of $%s via %s has been approved.', to_char(v_dep.amount, 'FM999,990.00'), coalesce(v_dep.method, v_dep.payment_method, 'bKash')),
    'reward',
    'employer',
    timezone('utc'::text, now())
  );
end; $$;

create or replace function public.admin_reject_deposit(p_deposit_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_dep public.deposit_requests%rowtype;
  v_reason text;
  v_target_user_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can reject deposits.';
  end if;
  select * into v_dep from public.deposit_requests where id = p_deposit_id for update;
  if not found or v_dep.status <> 'pending' then
    raise exception 'Deposit request not found or already reviewed.';
  end if;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'Rejected by admin');
  v_target_user_id := coalesce(v_dep.employer_id, v_dep.user_id);

  update public.deposit_requests
  set status = 'rejected',
      rejection_reason = v_reason,
      reviewed_at = timezone('utc'::text, now()),
      reviewed_by = auth.uid()
  where id = p_deposit_id;

  if v_target_user_id is not null then
    insert into public.notifications (user_id, title, message, type, target_role, created_at)
    values (v_target_user_id, 'Deposit Rejected', v_reason, 'alert', 'employer', timezone('utc'::text, now()));
  end if;
end; $$;

-- I. Withdrawal Request & Admin Review RPCs
create or replace function public.request_withdrawal(p_amount numeric, p_method text, p_account_details text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_balance numeric(12,2);
  v_fee_rate numeric(5,2);
  v_fee numeric(12,2);
  v_net numeric(12,2);
  v_id uuid;
  v_setting text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'worker' then
    raise exception 'Only workers can request withdrawals.';
  end if;
  if p_amount is null or p_amount < 2 then
    raise exception 'Minimum withdrawal amount is $2.00.';
  end if;
  if lower(trim(p_method)) not in ('bkash', 'nagad') then
    raise exception 'Withdrawal method must be bKash or Nagad.';
  end if;
  if btrim(coalesce(p_account_details, '')) = '' then
    raise exception 'Account details are required.';
  end if;

  select earnings into v_balance from public.profiles where id = auth.uid() for update;
  if coalesce(v_balance, 0) < p_amount then
    raise exception 'You cannot withdraw more than your available earnings ($% available).', to_char(coalesce(v_balance, 0), 'FM999,990.00');
  end if;

  select value into v_setting from public.system_settings where key = 'withdrawal_fee_rate';
  v_fee_rate := greatest(0, least(coalesce(nullif(v_setting, '')::numeric, 2.00), 100));
  v_fee := round((p_amount * v_fee_rate / 100.00)::numeric, 2);
  v_net := p_amount - v_fee;

  -- Deduct earnings and add to spent
  update public.profiles
  set earnings = earnings - p_amount,
      spent = spent + p_amount,
      updated_at = timezone('utc'::text, now())
  where id = auth.uid();
  
  insert into public.withdrawals (
    worker_id, amount, fee_amount, net_amount, method, account_number, account_details, status, created_at, updated_at
  )
  values (
    auth.uid(), p_amount, v_fee, v_net, lower(trim(p_method)), btrim(p_account_details), btrim(p_account_details), 'pending', timezone('utc'::text, now()), timezone('utc'::text, now())
  )
  returning id into v_id;

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (auth.uid(), 'withdrawal', p_amount, 'pending', jsonb_build_object('withdrawal_id', v_id, 'method', p_method, 'fee_rate', v_fee_rate, 'fee_amount', v_fee, 'net_amount', v_net), timezone('utc'::text, now()));

  return v_id;
end; $$;

create or replace function public.admin_approve_withdrawal(p_withdrawal_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_w public.withdrawals%rowtype;
  v_rate numeric;
  v_setting text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can approve withdrawals.';
  end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found or v_w.status <> 'pending' then
    raise exception 'Withdrawal not found or already processed.';
  end if;

  update public.withdrawals set status = 'completed', updated_at = timezone('utc'::text, now()) where id = p_withdrawal_id;
  select value into v_setting from public.system_settings where key = 'withdrawal_fee_rate';
  v_rate := coalesce(nullif(v_setting, '')::numeric, 2.00);

  if coalesce(v_w.fee_amount, 0) > 0 then
    insert into public.withdrawal_fee_earnings (withdrawal_id, worker_id, withdrawal_amount, fee_rate, fee_amount, created_at)
    values (v_w.id, v_w.worker_id, v_w.amount, v_rate, v_w.fee_amount, timezone('utc'::text, now()))
    on conflict (withdrawal_id) do nothing;
  end if;

  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (v_w.worker_id, 'Withdrawal Approved', 'Your withdrawal of $' || to_char(v_w.net_amount, 'FM999,990.00') || ' has been approved and paid.', 'reward', 'worker', timezone('utc'::text, now()));
end; $$;

create or replace function public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
  v_w public.withdrawals%rowtype;
  v_reason text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'Only admins can reject withdrawals.';
  end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found or v_w.status <> 'pending' then
    raise exception 'Withdrawal not found or already processed.';
  end if;
  v_reason := coalesce(nullif(btrim(p_reason), ''), 'Rejected by admin');

  update public.withdrawals set status = 'rejected', rejection_reason = v_reason, updated_at = timezone('utc'::text, now()) where id = p_withdrawal_id;
  update public.profiles set earnings = earnings + v_w.amount, spent = greatest(spent - v_w.amount, 0), updated_at = timezone('utc'::text, now()) where id = v_w.worker_id;

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (v_w.worker_id, 'admin_adjustment', v_w.amount, 'completed', jsonb_build_object('withdrawal_id', v_w.id, 'reason', v_reason, 'action', 'withdrawal_refund'), timezone('utc'::text, now()));

  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (v_w.worker_id, 'Withdrawal Rejected', v_reason, 'alert', 'worker', timezone('utc'::text, now()));
end; $$;

-- J. Notifications & System Settings RPCs
create or replace function public.admin_send_notification(p_title text, p_message text, p_type text default 'announcement', p_target_role text default 'all', p_user_id uuid default null)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can send notifications.';
  end if;
  if btrim(coalesce(p_title, '')) = '' or btrim(coalesce(p_message, '')) = '' then
    raise exception 'Notification title and message cannot be empty.';
  end if;

  insert into public.notifications (user_id, title, message, type, target_role, created_by, created_at)
  values (p_user_id, btrim(p_title), btrim(p_message), coalesce(nullif(btrim(p_type), ''), 'announcement'), coalesce(p_target_role, 'all'), auth.uid(), timezone('utc'::text, now()))
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.admin_delete_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can delete notifications.';
  end if;
  delete from public.notifications where id = p_notification_id;
end; $$;

create or replace function public.mark_notification_as_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notification_reads (notification_id, user_id, read_at)
  values (p_notification_id, auth.uid(), timezone('utc'::text, now()))
  on conflict (notification_id, user_id) do update set read_at = excluded.read_at;
end; $$;

create or replace function public.mark_all_notifications_as_read()
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  insert into public.notification_reads (notification_id, user_id, read_at)
  select n.id, auth.uid(), timezone('utc'::text, now())
  from public.notifications n
  where n.user_id = auth.uid() or (n.user_id is null and (n.target_role = 'all' or n.target_role = v_role))
  on conflict (notification_id, user_id) do update set read_at = excluded.read_at;
end; $$;

create or replace function public.admin_update_system_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can update system settings.';
  end if;
  if btrim(coalesce(p_key, '')) = '' or btrim(coalesce(p_value, '')) = '' then
    raise exception 'Setting key and value cannot be empty.';
  end if;
  if p_key in ('referral_commission_rate', 'platform_commission_rate', 'withdrawal_fee_rate') then
    if p_value::numeric < 0 or p_value::numeric > 100 then
      raise exception 'Rate must be between 0 and 100.';
    end if;
  end if;

  insert into public.system_settings (key, value, label, updated_at, updated_by)
  values (p_key, btrim(p_value), p_key, timezone('utc'::text, now()), auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = timezone('utc'::text, now()), updated_by = auth.uid();
end; $$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.platform_earnings enable row level security;
alter table public.withdrawals enable row level security;
alter table public.transactions enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.system_settings enable row level security;
alter table public.withdrawal_fee_earnings enable row level security;

-- Helper admin check
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Profiles: Authenticated users can read profiles (needed for names/roles across task listings & reviews)
drop policy if exists "profiles_select_secure" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- Tasks: Marketplace and Dashboards can select tasks without RLS locks
drop policy if exists "tasks_select_secure" on public.tasks;
drop policy if exists "tasks_select_policy" on public.tasks;
drop policy if exists "tasks_select_all" on public.tasks;
create policy "tasks_select_all" on public.tasks for select to authenticated, anon using (true);

drop policy if exists "tasks_insert_policy" on public.tasks;
create policy "tasks_insert_policy" on public.tasks for insert to authenticated with check (employer_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_update_policy" on public.tasks;
create policy "tasks_update_policy" on public.tasks for update to authenticated using (
  employer_id = auth.uid() or public.is_admin()
);

drop policy if exists "tasks_delete_policy" on public.tasks;
create policy "tasks_delete_policy" on public.tasks for delete to authenticated using (
  employer_id = auth.uid() or public.is_admin()
);

-- Submissions
drop policy if exists "submissions_select_secure" on public.submissions;
drop policy if exists "submissions_select_policy" on public.submissions;
create policy "submissions_select_secure" on public.submissions for select to authenticated
using (worker_id = auth.uid() or employer_id = auth.uid() or public.is_admin());

drop policy if exists "submissions_insert_policy" on public.submissions;
create policy "submissions_insert_policy" on public.submissions for insert to authenticated with check (worker_id = auth.uid());

drop policy if exists "submissions_update_policy" on public.submissions;
create policy "submissions_update_policy" on public.submissions for update to authenticated using (
  employer_id = auth.uid() or worker_id = auth.uid() or public.is_admin()
);

-- Referral Commissions
drop policy if exists "referral_commissions_select_secure" on public.referral_commissions;
drop policy if exists "commissions_select_policy" on public.referral_commissions;
create policy "referral_commissions_select_secure" on public.referral_commissions for select to authenticated
using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

-- Withdrawals
drop policy if exists "withdrawals_select_secure" on public.withdrawals;
drop policy if exists "withdrawals_select_policy" on public.withdrawals;
create policy "withdrawals_select_secure" on public.withdrawals for select to authenticated
using (worker_id = auth.uid() or public.is_admin());

drop policy if exists "withdrawals_insert_policy" on public.withdrawals;
create policy "withdrawals_insert_policy" on public.withdrawals for insert to authenticated with check (worker_id = auth.uid());

-- Transactions
drop policy if exists "transactions_select_secure" on public.transactions;
drop policy if exists "transactions_select_policy" on public.transactions;
create policy "transactions_select_secure" on public.transactions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Deposit Requests
drop policy if exists "deposits_select_secure" on public.deposit_requests;
drop policy if exists "deposits_select_policy" on public.deposit_requests;
create policy "deposits_select_secure" on public.deposit_requests for select to authenticated
using (employer_id = auth.uid() or user_id = auth.uid() or public.is_admin());

drop policy if exists "deposits_insert_policy" on public.deposit_requests;
create policy "deposits_insert_policy" on public.deposit_requests for insert to authenticated with check (
  employer_id = auth.uid() or user_id = auth.uid() or public.is_admin()
);

-- Notifications
drop policy if exists "notifications_select_secure" on public.notifications;
drop policy if exists "notifications_select_policy" on public.notifications;
create policy "notifications_select_secure" on public.notifications for select to authenticated
using (
  user_id = auth.uid()
  or user_id is null
  or public.is_admin()
);

-- Notification Reads
drop policy if exists "notification_reads_select_secure" on public.notification_reads;
drop policy if exists "reads_policy" on public.notification_reads;
create policy "notification_reads_select_secure" on public.notification_reads for select to authenticated using (user_id = auth.uid());

drop policy if exists "notification_reads_insert_secure" on public.notification_reads;
create policy "notification_reads_insert_secure" on public.notification_reads for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "notification_reads_update_secure" on public.notification_reads;
create policy "notification_reads_update_secure" on public.notification_reads for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- System Settings
drop policy if exists "system_settings_select_secure" on public.system_settings;
drop policy if exists "settings_select_policy" on public.system_settings;
create policy "system_settings_select_secure" on public.system_settings for select to authenticated, anon using (true);

-- Platform Earnings & Withdrawal Fee Earnings
drop policy if exists "platform_earnings_select_admin" on public.platform_earnings;
create policy "platform_earnings_select_admin" on public.platform_earnings for select to authenticated using (public.is_admin());

drop policy if exists "withdrawal_fee_earnings_select_admin" on public.withdrawal_fee_earnings;
create policy "withdrawal_fee_earnings_select_admin" on public.withdrawal_fee_earnings for select to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKET FOR TASK PROOFS
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "task_proofs_public_select" on storage.objects;
create policy "task_proofs_public_select" on storage.objects for select to public using (bucket_id = 'task-proofs');

drop policy if exists "task_proofs_auth_insert" on storage.objects;
create policy "task_proofs_auth_insert" on storage.objects for insert to authenticated with check (bucket_id = 'task-proofs');

-- ----------------------------------------------------------------------------
-- 8. GRANTS & REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated, anon;
grant select on all tables in schema public to authenticated;
grant select on public.tasks, public.system_settings to anon;

grant execute on function public.create_task_with_funding(text, text, text, text, numeric, int, int, int) to authenticated;
grant execute on function public.submit_task_proof(uuid, text, text) to authenticated;
grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.approve_submission_and_pay(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.reject_submission_and_refund(uuid, text) to authenticated;
grant execute on function public.request_deposit(numeric, text, text, text) to authenticated;
grant execute on function public.admin_approve_deposit(uuid) to authenticated;
grant execute on function public.admin_reject_deposit(uuid, text) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
grant execute on function public.admin_send_notification(text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_delete_notification(uuid) to authenticated;
grant execute on function public.mark_notification_as_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_as_read() to authenticated;
grant execute on function public.admin_update_system_setting(text, text) to authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.notification_reads; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.referral_commissions; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.submissions; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.deposit_requests; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.withdrawals; exception when duplicate_object then null; when undefined_object then null; end;
end $$;
