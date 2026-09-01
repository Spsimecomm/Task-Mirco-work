-- ============================================================================
-- TASKLY MASTER PRODUCTION SCHEMA & SECURITY MIGRATION (V3.4 - Auto-Healing)
-- ============================================================================
-- Features:
--   1. Strict Worker-Only Referral System (Employer/Admin excluded)
--   2. Dynamic Unique Referral Code Generator (e.g. TANV5081, SHIM4920)
--   3. Comprehensive Auto-Healing on ALL Tables (Fixes 42703 missing column errors)
--   4. Dynamic Function Signature Cleanup (Fixes 42P13 return type change errors)
--   5. Micro-Task Marketplace, Escrow Engine & 5% Referral Commission Ledger
--   6. Full Row-Level Security (RLS) Policies (Referrals, Profiles, Notifications)
--   7. Realtime Notifications, System Settings & Financial Management
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. BASE TABLES (CREATE IF NOT EXISTS)
-- ----------------------------------------------------------------------------

-- A. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New user',
  role text not null check (role in ('worker', 'employer', 'admin')) default 'worker',
  referral_code text unique,
  referred_by uuid references public.profiles(id) on delete set null,
  earnings numeric(12,2) not null default 0.00 check (earnings >= 0),
  pending numeric(12,2) not null default 0.00 check (pending >= 0),
  spent numeric(12,2) not null default 0.00 check (spent >= 0),
  deposited numeric(12,2) not null default 0.00 check (deposited >= 0),
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
  reward numeric(12,2) not null default 0.50 check (reward > 0),
  max_workers int not null default 1 check (max_workers > 0),
  slots_total int not null default 1 check (slots_total > 0),
  slots_filled int not null default 0,
  time_limit_minutes int not null default 60 check (time_limit_minutes > 0),
  status text not null check (status in ('open', 'completed', 'cancelled', 'closed')) default 'open',
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
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  rejection_reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(task_id, worker_id)
);

-- D. Referral Commissions Ledger
create table if not exists public.referral_commissions (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'task_approval',
  source_id uuid not null,
  eligible_amount numeric(12,2) not null default 0.00,
  commission_rate numeric(5,2) not null default 5.00,
  commission_amount numeric(12,2) not null default 0.00 check (commission_amount >= 0),
  status text not null default 'completed' check (status in ('completed', 'cancelled', 'pending')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique(source_type, source_id, referrer_id)
);

-- E. Financial Transactions History
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'earning', 'withdrawal', 'escrow_hold', 'escrow_release', 'escrow_refund', 'admin_adjustment', 'spend')),
  amount numeric(12,2) not null default 0.00 check (amount >= 0),
  status text not null check (status in ('pending', 'completed', 'rejected', 'failed')) default 'completed',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- F. Withdrawals
create table if not exists public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  method text not null default 'bKash',
  account_number text,
  account_details text,
  amount numeric(12,2) not null default 0.00 check (amount >= 0),
  fee_amount numeric(12,2) not null default 0.00 check (fee_amount >= 0),
  net_amount numeric(12,2) not null default 0.00 check (net_amount >= 0),
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed')) default 'pending',
  rejection_reason text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- G. Deposit Requests
create table if not exists public.deposit_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  employer_id uuid references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null default 0.00 check (amount >= 0),
  payment_method text,
  method text,
  transaction_id text,
  trx_id text,
  sender_number text,
  sender_mobile text,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  rejection_reason text,
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- H. Platform Earnings & Fee Ledgers
create table if not exists public.platform_earnings (
  id uuid primary key default uuid_generate_v4(),
  submission_id uuid references public.submissions(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  worker_id uuid references public.profiles(id) on delete cascade,
  employer_id uuid references public.profiles(id) on delete cascade,
  reward_amount numeric(12,2) not null default 0.00,
  commission_rate numeric(5,2) not null default 10.00,
  commission_amount numeric(12,2) not null default 0.00,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.withdrawal_fee_earnings (
  id uuid primary key default uuid_generate_v4(),
  withdrawal_id uuid not null unique references public.withdrawals(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  withdrawal_amount numeric(12,2) not null default 0.00,
  gross_amount numeric(12,2) not null default 0.00,
  fee_rate numeric(5,2) not null default 2.00,
  fee_amount numeric(12,2) not null default 0.00,
  net_amount numeric(12,2) not null default 0.00,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- I. Notifications & Settings
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null default '',
  body text not null default '',
  type text not null default 'system' check (type in ('system', 'task', 'referral', 'finance', 'announcement')),
  target_role text not null default 'all' check (target_role in ('all', 'worker', 'employer', 'admin')),
  target_user_id uuid references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.notification_reads (
  id uuid primary key default uuid_generate_v4(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default timezone('utc'::text, now()),
  unique(notification_id, user_id)
);

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Seed System Settings
insert into public.system_settings (key, value, description)
values
  ('min_withdrawal_amount', '2.00', 'Minimum withdrawal threshold in USD'),
  ('withdrawal_fee_rate', '2.00', 'Platform withdrawal service fee in percent'),
  ('platform_commission_rate', '10.00', 'Platform commission rate in percent'),
  ('referral_commission_rate', '5.00', 'Worker referral commission percentage on task earnings'),
  ('min_deposit_amount', '10.00', 'Minimum deposit threshold in USD')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. COMPREHENSIVE AUTO-HEALING (Guarantees ALL columns exist across ALL tables)
-- ----------------------------------------------------------------------------
do $$
begin
  -- 1. profiles table columns
  alter table public.profiles add column if not exists full_name text default 'New user';
  alter table public.profiles add column if not exists role text default 'worker';
  alter table public.profiles add column if not exists referral_code text;
  alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
  alter table public.profiles add column if not exists earnings numeric(12,2) default 0.00;
  alter table public.profiles add column if not exists pending numeric(12,2) default 0.00;
  alter table public.profiles add column if not exists spent numeric(12,2) default 0.00;
  alter table public.profiles add column if not exists deposited numeric(12,2) default 0.00;
  alter table public.profiles add column if not exists created_at timestamptz default timezone('utc'::text, now());
  alter table public.profiles add column if not exists updated_at timestamptz default timezone('utc'::text, now());

  -- 2. tasks table columns
  alter table public.tasks add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
  alter table public.tasks add column if not exists title text default '';
  alter table public.tasks add column if not exists category text default 'Micro Task';
  alter table public.tasks add column if not exists description text default '';
  alter table public.tasks add column if not exists proof_instructions text default 'Provide proof of completion';
  alter table public.tasks add column if not exists reward numeric(12,2) default 0.50;
  alter table public.tasks add column if not exists max_workers int default 1;
  alter table public.tasks add column if not exists slots_total int default 1;
  alter table public.tasks add column if not exists slots_filled int default 0;
  alter table public.tasks add column if not exists time_limit_minutes int default 60;
  alter table public.tasks add column if not exists status text default 'open';
  alter table public.tasks add column if not exists created_at timestamptz default timezone('utc'::text, now());
  alter table public.tasks add column if not exists updated_at timestamptz default timezone('utc'::text, now());

  -- 3. submissions table columns
  alter table public.submissions add column if not exists task_id uuid references public.tasks(id) on delete cascade;
  alter table public.submissions add column if not exists worker_id uuid references public.profiles(id) on delete cascade;
  alter table public.submissions add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
  alter table public.submissions add column if not exists proof text default '';
  alter table public.submissions add column if not exists proof_text text;
  alter table public.submissions add column if not exists proof_file_url text;
  alter table public.submissions add column if not exists proof_url text;
  alter table public.submissions add column if not exists worker_name text;
  alter table public.submissions add column if not exists status text default 'pending';
  alter table public.submissions add column if not exists rejection_reason text;
  alter table public.submissions add column if not exists created_at timestamptz default timezone('utc'::text, now());
  alter table public.submissions add column if not exists reviewed_at timestamptz;
  alter table public.submissions add column if not exists updated_at timestamptz default timezone('utc'::text, now());

  -- 4. referral_commissions table columns
  alter table public.referral_commissions add column if not exists referrer_id uuid references public.profiles(id) on delete cascade;
  alter table public.referral_commissions add column if not exists referred_id uuid references public.profiles(id) on delete cascade;
  alter table public.referral_commissions add column if not exists source_type text default 'task_approval';
  alter table public.referral_commissions add column if not exists source_id uuid;
  alter table public.referral_commissions add column if not exists eligible_amount numeric(12,2) default 0.00;
  alter table public.referral_commissions add column if not exists commission_rate numeric(5,2) default 5.00;
  alter table public.referral_commissions add column if not exists commission_amount numeric(12,2) default 0.00;
  alter table public.referral_commissions add column if not exists status text default 'completed';
  alter table public.referral_commissions add column if not exists created_at timestamptz default timezone('utc'::text, now());

  -- 5. transactions table columns
  alter table public.transactions add column if not exists user_id uuid references public.profiles(id) on delete cascade;
  alter table public.transactions add column if not exists type text default 'earning';
  alter table public.transactions add column if not exists amount numeric(12,2) default 0.00;
  alter table public.transactions add column if not exists status text default 'completed';
  alter table public.transactions add column if not exists meta jsonb default '{}'::jsonb;
  alter table public.transactions add column if not exists created_at timestamptz default timezone('utc'::text, now());

  -- 6. withdrawals table columns
  alter table public.withdrawals add column if not exists worker_id uuid references public.profiles(id) on delete cascade;
  alter table public.withdrawals add column if not exists method text default 'bKash';
  alter table public.withdrawals add column if not exists fee_amount numeric(12,2) default 0.00;
  alter table public.withdrawals add column if not exists net_amount numeric(12,2) default 0.00;
  alter table public.withdrawals add column if not exists account_details text;
  alter table public.withdrawals add column if not exists account_number text;
  alter table public.withdrawals add column if not exists rejection_reason text;
  alter table public.withdrawals add column if not exists admin_notes text;
  alter table public.withdrawals add column if not exists status text default 'pending';
  alter table public.withdrawals add column if not exists created_at timestamptz default timezone('utc'::text, now());
  alter table public.withdrawals add column if not exists updated_at timestamptz default timezone('utc'::text, now());

  -- Sync withdrawals user_id -> worker_id if needed
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'withdrawals' and column_name = 'user_id') then
    update public.withdrawals set worker_id = user_id where worker_id is null;
  end if;

  -- 7. deposit_requests table columns
  alter table public.deposit_requests add column if not exists user_id uuid references public.profiles(id) on delete cascade;
  alter table public.deposit_requests add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
  alter table public.deposit_requests add column if not exists amount numeric(12,2) default 0.00;
  alter table public.deposit_requests add column if not exists payment_method text;
  alter table public.deposit_requests add column if not exists method text;
  alter table public.deposit_requests add column if not exists transaction_id text;
  alter table public.deposit_requests add column if not exists trx_id text;
  alter table public.deposit_requests add column if not exists sender_number text;
  alter table public.deposit_requests add column if not exists sender_mobile text;
  alter table public.deposit_requests add column if not exists status text default 'pending';
  alter table public.deposit_requests add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
  alter table public.deposit_requests add column if not exists reviewed_at timestamptz;
  alter table public.deposit_requests add column if not exists rejection_reason text;
  alter table public.deposit_requests add column if not exists admin_notes text;
  alter table public.deposit_requests add column if not exists created_at timestamptz default timezone('utc'::text, now());

  -- Sync deposit_requests user_id / employer_id
  update public.deposit_requests set user_id = coalesce(user_id, employer_id);
  update public.deposit_requests set employer_id = coalesce(employer_id, user_id);

  -- 8. notifications table columns (CRUCIAL: Prevents column "target_role" does not exist)
  alter table public.notifications add column if not exists title text default '';
  alter table public.notifications add column if not exists body text default '';
  alter table public.notifications add column if not exists type text default 'system';
  alter table public.notifications add column if not exists target_role text default 'all';
  alter table public.notifications add column if not exists target_user_id uuid references public.profiles(id) on delete cascade;
  alter table public.notifications add column if not exists created_by uuid references public.profiles(id) on delete set null;
  alter table public.notifications add column if not exists created_at timestamptz default timezone('utc'::text, now());

  -- Sync legacy notification columns if they exist
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'message') then
    update public.notifications set body = message where (body is null or body = '') and message is not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'role') then
    update public.notifications set target_role = role where (target_role is null or target_role = 'all') and role is not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id') then
    update public.notifications set target_user_id = user_id where target_user_id is null and user_id is not null;
  end if;

  -- 9. notification_reads table columns
  alter table public.notification_reads add column if not exists notification_id uuid references public.notifications(id) on delete cascade;
  alter table public.notification_reads add column if not exists user_id uuid references public.profiles(id) on delete cascade;
  alter table public.notification_reads add column if not exists read_at timestamptz default timezone('utc'::text, now());

  -- 10. system_settings table columns
  alter table public.system_settings add column if not exists key text;
  alter table public.system_settings add column if not exists value text default '';
  alter table public.system_settings add column if not exists description text;
  alter table public.system_settings add column if not exists updated_at timestamptz default timezone('utc'::text, now());
end $$;

-- ----------------------------------------------------------------------------
-- 3. INDEXES (Guaranteed Safe)
-- ----------------------------------------------------------------------------
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create unique index if not exists idx_profiles_referral_code_upper on public.profiles(upper(referral_code)) where referral_code is not null;

create index if not exists idx_tasks_employer on public.tasks(employer_id);
create index if not exists idx_tasks_status on public.tasks(status);

create index if not exists idx_submissions_worker on public.submissions(worker_id);
create index if not exists idx_submissions_employer on public.submissions(employer_id);
create index if not exists idx_submissions_status on public.submissions(status);

create index if not exists idx_ref_comm_referrer on public.referral_commissions(referrer_id);
create index if not exists idx_ref_comm_referred on public.referral_commissions(referred_id);

create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_transactions_created on public.transactions(created_at desc);

create index if not exists idx_withdrawals_worker on public.withdrawals(worker_id);
create index if not exists idx_withdrawals_status on public.withdrawals(status);

create index if not exists idx_deposits_user on public.deposit_requests(coalesce(user_id, employer_id));
create index if not exists idx_deposits_status on public.deposit_requests(status);

create index if not exists idx_notifications_role on public.notifications(target_role);
create index if not exists idx_notifications_target_user on public.notifications(target_user_id);

-- ----------------------------------------------------------------------------
-- 4. CLEANUP OLD FUNCTIONS (Prevents 42P13 Return Type Conflict Errors)
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select routine_name, specific_name, data_type
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in (
        'generate_unique_referral_code',
        'handle_new_user',
        'process_referral_commission',
        'create_task_with_funding',
        'submit_task_proof',
        'approve_submission_and_pay',
        'approve_submission',
        'reject_submission_and_refund',
        'reject_submission',
        'request_deposit',
        'request_withdrawal',
        'admin_approve_deposit',
        'admin_reject_deposit',
        'admin_approve_withdrawal',
        'admin_reject_withdrawal',
        'admin_adjust_user_balance',
        'admin_update_user_role',
        'admin_send_notification',
        'admin_delete_notification',
        'admin_update_system_settings'
      )
  ) loop
    execute 'drop function if exists public.' || quote_ident(r.routine_name) || ' cascade';
  end loop;
end $$;

-- Drop triggers that depend on handle_new_user before recreating
drop trigger if exists on_auth_user_created on auth.users;

-- ----------------------------------------------------------------------------
-- 5. BUSINESS LOGIC & RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- A. Dynamic Unique Referral Code Generator (e.g. TANV5081, SHIM4920)
create or replace function public.generate_unique_referral_code(p_full_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
begin
  v_prefix := upper(substring(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z]', '', 'g') from 1 for 4));
  if length(v_prefix) < 3 then
    v_prefix := 'WORK';
  end if;

  loop
    v_code := v_prefix || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
    select exists(select 1 from public.profiles where upper(referral_code) = v_code) into v_exists;
    if not v_exists then
      return v_code;
    end if;
    v_attempts := v_attempts + 1;
    if v_attempts > 30 then
      v_code := 'WRK' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
      return v_code;
    end if;
  end loop;
end;
$$;

-- B. User Signup Trigger (Strict Worker-Only Referral Code & Referrer Link)
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
  v_role := coalesce(new.raw_user_meta_data->>'role', 'worker');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'New user');

  if v_role not in ('worker', 'employer', 'admin') then
    v_role := 'worker';
  end if;

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
      where upper(referral_code) = v_ref_code
        and role = 'worker'
        and id <> new.id
      limit 1;
    end if;

    v_my_ref_code := public.generate_unique_referral_code(v_full_name);
  else
    v_my_ref_code := null;
    v_referrer_id := null;
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    referral_code,
    referred_by,
    earnings,
    pending,
    spent,
    deposited
  )
  values (
    new.id,
    v_full_name,
    v_role,
    v_my_ref_code,
    v_referrer_id,
    0.00,
    0.00,
    0.00,
    0.00
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    referral_code = coalesce(public.profiles.referral_code, excluded.referral_code);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- C. Process Referral Commission (Strictly for Worker Referrers)
create or replace function public.process_referral_commission(
  p_referred_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_eligible_amount numeric,
  p_rate numeric default 5.00
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_referrer_role text;
  v_commission_amount numeric(12,2);
  v_comm_id uuid;
begin
  if p_eligible_amount <= 0 then
    return null;
  end if;

  select referred_by into v_referrer_id
  from public.profiles
  where id = p_referred_id;

  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return null;
  end if;

  select role into v_referrer_role
  from public.profiles
  where id = v_referrer_id
  for update;

  if v_referrer_role is distinct from 'worker' then
    return null;
  end if;

  v_commission_amount := round((p_eligible_amount * p_rate / 100)::numeric, 2);
  if v_commission_amount <= 0 then
    return null;
  end if;

  begin
    insert into public.referral_commissions (
      referrer_id,
      referred_id,
      source_type,
      source_id,
      eligible_amount,
      commission_rate,
      commission_amount,
      status
    )
    values (
      v_referrer_id,
      p_referred_id,
      p_source_type,
      p_source_id,
      p_eligible_amount,
      p_rate,
      'completed'
    )
    returning id into v_comm_id;
  exception
    when unique_violation then
      return null;
  end;

  update public.profiles
  set earnings = earnings + v_commission_amount
  where id = v_referrer_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_referrer_id,
    'earning',
    v_commission_amount,
    'completed',
    jsonb_build_object(
      'source', 'referral_commission',
      'referral_commission_id', v_comm_id,
      'referred_user_id', p_referred_id,
      'source_type', p_source_type,
      'source_id', p_source_id,
      'commission_rate', p_rate
    )
  );

  return v_comm_id;
end;
$$;

-- D. Task Creation with Escrow Hold
create or replace function public.create_task_with_funding(
  p_title text,
  p_category text default 'Micro Task',
  p_description text default '',
  p_proof_instructions text default 'Proof of completion required',
  p_reward numeric default 0.50,
  p_slots_total int default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_total_cost numeric(12,2);
  v_deposited numeric(12,2);
  v_new_task_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_reward <= 0 or p_slots_total <= 0 then
    raise exception 'Invalid task parameters.';
  end if;

  v_total_cost := round((p_reward * p_slots_total)::numeric, 2);

  select deposited into v_deposited
  from public.profiles
  where id = v_caller_id
  for update;

  if v_deposited is null or v_deposited < v_total_cost then
    raise exception 'Insufficient balance. Need $%, available: $%.', v_total_cost, coalesce(v_deposited, 0);
  end if;

  update public.profiles
  set deposited = deposited - v_total_cost,
      spent = spent + v_total_cost
  where id = v_caller_id;

  insert into public.tasks (
    employer_id,
    title,
    category,
    description,
    proof_instructions,
    reward,
    max_workers,
    slots_total,
    slots_filled,
    time_limit_minutes,
    status
  )
  values (
    v_caller_id,
    p_title,
    p_category,
    p_description,
    p_proof_instructions,
    p_reward,
    p_slots_total,
    p_slots_total,
    0,
    60,
    'open'
  )
  returning id into v_new_task_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_caller_id,
    'escrow_hold',
    v_total_cost,
    'completed',
    jsonb_build_object('task_id', v_new_task_id, 'reward', p_reward, 'slots', p_slots_total)
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
  v_worker_id uuid;
  v_worker_name text;
  v_task public.tasks%rowtype;
  v_sub_id uuid;
begin
  v_worker_id := auth.uid();
  if v_worker_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_task from public.tasks where id = p_task_id;
  if not found or v_task.status <> 'open' then
    raise exception 'Task is no longer available.';
  end if;

  select full_name into v_worker_name from public.profiles where id = v_worker_id;

  insert into public.submissions (
    task_id,
    worker_id,
    employer_id,
    worker_name,
    proof,
    proof_text,
    proof_url,
    proof_file_url,
    status
  )
  values (
    p_task_id,
    v_worker_id,
    v_task.employer_id,
    coalesce(v_worker_name, 'Worker'),
    p_proof_text,
    p_proof_text,
    p_proof_url,
    p_proof_url,
    'pending'
  )
  returning id into v_sub_id;

  return v_sub_id;
end;
$$;

-- F. Approve Submission & Payout (With 5% Referral Commission)
create or replace function public.approve_submission_and_pay(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_sub record;
  v_task record;
  v_approved_count int;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_sub
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found.';
  end if;

  if v_sub.status <> 'pending' then
    raise exception 'Submission already processed (status: %).', v_sub.status;
  end if;

  if v_sub.employer_id <> v_caller_id then
    if not exists (select 1 from public.profiles where id = v_caller_id and role = 'admin') then
      raise exception 'Unauthorized to approve this submission.';
    end if;
  end if;

  select * into v_task
  from public.tasks
  where id = v_sub.task_id;

  -- 1. Mark approved
  update public.submissions
  set status = 'approved',
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- 2. Credit worker earnings
  update public.profiles
  set earnings = earnings + v_task.reward
  where id = v_sub.worker_id;

  -- 3. Worker transaction
  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_sub.worker_id,
    'earning',
    v_task.reward,
    'completed',
    jsonb_build_object('submission_id', p_submission_id, 'task_id', v_sub.task_id, 'task_title', v_task.title)
  );

  -- 4. Process Worker-Only Referral Commission (5%)
  perform public.process_referral_commission(
    v_sub.worker_id,
    'task_approval',
    p_submission_id,
    v_task.reward,
    5.00
  );

  -- 5. Complete task if max reached
  select count(*) into v_approved_count
  from public.submissions
  where task_id = v_sub.task_id and status = 'approved';

  update public.tasks
  set slots_filled = v_approved_count
  where id = v_sub.task_id;

  if v_approved_count >= coalesce(v_task.max_workers, v_task.slots_total, 1) then
    update public.tasks
    set status = 'completed',
        updated_at = timezone('utc'::text, now())
    where id = v_sub.task_id;
  end if;
end;
$$;

create or replace function public.approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_submission_and_pay(p_submission_id);
end;
$$;

-- G. Reject Submission & Refund
create or replace function public.reject_submission_and_refund(
  p_submission_id uuid,
  p_reason text default 'Submission does not meet task requirements'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_sub record;
  v_task record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_sub
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found.';
  end if;

  if v_sub.status <> 'pending' then
    raise exception 'Submission already processed (status: %).', v_sub.status;
  end if;

  if v_sub.employer_id <> v_caller_id then
    if not exists (select 1 from public.profiles where id = v_caller_id and role = 'admin') then
      raise exception 'Unauthorized.';
    end if;
  end if;

  select * into v_task
  from public.tasks
  where id = v_sub.task_id;

  update public.submissions
  set status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- Refund employer deposited balance
  update public.profiles
  set deposited = deposited + v_task.reward,
      spent = greatest(spent - v_task.reward, 0)
  where id = v_sub.employer_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_sub.employer_id,
    'escrow_refund',
    v_task.reward,
    'completed',
    jsonb_build_object('submission_id', p_submission_id, 'task_id', v_sub.task_id, 'reason', p_reason)
  );
end;
$$;

create or replace function public.reject_submission(p_submission_id uuid, p_reason text default 'Rejected')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.reject_submission_and_refund(p_submission_id, p_reason);
end;
$$;

-- H. Deposit & Withdrawal Request Functions
create or replace function public.request_deposit(
  p_amount numeric,
  p_method text,
  p_sender_mobile text,
  p_trx_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_req_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount <= 0 then
    raise exception 'Invalid deposit amount.';
  end if;

  insert into public.deposit_requests (
    user_id,
    employer_id,
    amount,
    payment_method,
    method,
    sender_number,
    sender_mobile,
    transaction_id,
    trx_id,
    status
  )
  values (
    v_caller_id,
    v_caller_id,
    p_amount,
    p_method,
    p_method,
    p_sender_mobile,
    p_sender_mobile,
    p_trx_id,
    p_trx_id,
    'pending'
  )
  returning id into v_req_id;

  return v_req_id;
end;
$$;

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_account_details text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_balance numeric(12,2);
  v_fee numeric(12,2);
  v_net numeric(12,2);
  v_w_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_amount <= 0 then
    raise exception 'Invalid withdrawal amount.';
  end if;

  select earnings into v_balance from public.profiles where id = v_caller_id for update;
  if v_balance is null or v_balance < p_amount then
    raise exception 'Insufficient earnings balance.';
  end if;

  v_fee := round((p_amount * 0.02)::numeric, 2);
  v_net := p_amount - v_fee;

  update public.profiles
  set earnings = earnings - p_amount,
      spent = spent + p_amount
  where id = v_caller_id;

  insert into public.withdrawals (
    worker_id,
    amount,
    fee_amount,
    net_amount,
    method,
    account_number,
    account_details,
    status
  )
  values (
    v_caller_id,
    p_amount,
    v_fee,
    v_net,
    p_method,
    p_account_details,
    p_account_details,
    'pending'
  )
  returning id into v_w_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_caller_id,
    'withdrawal',
    p_amount,
    'pending',
    jsonb_build_object('withdrawal_id', v_w_id, 'fee', v_fee, 'net', v_net)
  );

  return v_w_id;
end;
$$;

-- I. Admin Functions
create or replace function public.admin_approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_dep record;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  select * into v_dep from public.deposit_requests where id = p_deposit_id for update;
  if not found or v_dep.status <> 'pending' then
    raise exception 'Deposit request not pending.';
  end if;

  update public.deposit_requests
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc'::text, now())
  where id = p_deposit_id;

  update public.profiles
  set deposited = deposited + v_dep.amount
  where id = coalesce(v_dep.user_id, v_dep.employer_id);

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    coalesce(v_dep.user_id, v_dep.employer_id),
    'deposit',
    v_dep.amount,
    'completed',
    jsonb_build_object('deposit_request_id', p_deposit_id, 'trx_id', coalesce(v_dep.transaction_id, v_dep.trx_id))
  );
end;
$$;

create or replace function public.admin_reject_deposit(p_deposit_id uuid, p_reason text default 'Rejected')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  update public.deposit_requests
  set status = 'rejected',
      rejection_reason = p_reason,
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc'::text, now())
  where id = p_deposit_id and status = 'pending';
end;
$$;

create or replace function public.admin_approve_withdrawal(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_w record;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found or v_w.status <> 'pending' then
    raise exception 'Withdrawal not pending.';
  end if;

  update public.withdrawals
  set status = 'completed',
      updated_at = timezone('utc'::text, now())
  where id = p_withdrawal_id;

  if v_w.fee_amount > 0 then
    insert into public.withdrawal_fee_earnings (
      withdrawal_id,
      worker_id,
      withdrawal_amount,
      gross_amount,
      fee_rate,
      fee_amount,
      net_amount
    )
    values (
      v_w.id,
      v_w.worker_id,
      v_w.amount,
      v_w.amount,
      2.00,
      v_w.fee_amount,
      v_w.net_amount
    )
    on conflict (withdrawal_id) do nothing;
  end if;
end;
$$;

create or replace function public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text default 'Rejected')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_w record;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found or v_w.status <> 'pending' then
    raise exception 'Withdrawal not pending.';
  end if;

  update public.withdrawals
  set status = 'rejected',
      rejection_reason = p_reason,
      updated_at = timezone('utc'::text, now())
  where id = p_withdrawal_id;

  -- Refund worker earnings
  update public.profiles
  set earnings = earnings + v_w.amount,
      spent = greatest(spent - v_w.amount, 0)
  where id = v_w.worker_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_w.worker_id,
    'earning',
    v_w.amount,
    'completed',
    jsonb_build_object('refunded_withdrawal_id', p_withdrawal_id, 'reason', p_reason)
  );
end;
$$;

create or replace function public.admin_adjust_user_balance(
  p_user_id uuid,
  p_field text,
  p_amount numeric,
  p_reason text default 'Admin adjustment'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  if p_field = 'earnings' then
    update public.profiles set earnings = greatest(0, earnings + p_amount) where id = p_user_id;
  elsif p_field = 'deposited' then
    update public.profiles set deposited = greatest(0, deposited + p_amount) where id = p_user_id;
  else
    raise exception 'Invalid balance field.';
  end if;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    p_user_id,
    'admin_adjustment',
    abs(p_amount),
    'completed',
    jsonb_build_object('field', p_field, 'delta', p_amount, 'reason', p_reason, 'admin_id', auth.uid())
  );
end;
$$;

create or replace function public.admin_update_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  if p_role not in ('worker', 'employer', 'admin') then
    raise exception 'Invalid role.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  if p_role <> 'worker' then
    update public.profiles set referral_code = null, referred_by = null where id = p_user_id;
  elsif (select referral_code from public.profiles where id = p_user_id) is null then
    update public.profiles
    set referral_code = public.generate_unique_referral_code(full_name)
    where id = p_user_id;
  end if;
end;
$$;

create or replace function public.admin_send_notification(
  p_title text,
  p_message text,
  p_type text default 'announcement',
  p_target_role text default 'all',
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_notif_id uuid;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  insert into public.notifications (
    title,
    body,
    type,
    target_role,
    target_user_id,
    created_by
  )
  values (
    p_title,
    p_message,
    p_type,
    p_target_role,
    p_user_id,
    auth.uid()
  )
  returning id into v_notif_id;

  return v_notif_id;
end;
$$;

create or replace function public.admin_delete_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  delete from public.notifications where id = p_notification_id;
end;
$$;

create or replace function public.admin_update_system_settings(
  p_referral_rate text,
  p_platform_rate text,
  p_withdrawal_fee_rate text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Admin privileges required.';
  end if;

  insert into public.system_settings (key, value, updated_at)
  values
    ('referral_commission_rate', p_referral_rate, timezone('utc'::text, now())),
    ('platform_commission_rate', p_platform_rate, timezone('utc'::text, now())),
    ('withdrawal_fee_rate', p_withdrawal_fee_rate, timezone('utc'::text, now()))
  on conflict (key) do update set
    value = excluded.value,
    updated_at = timezone('utc'::text, now());
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.platform_earnings enable row level security;
alter table public.withdrawal_fee_earnings enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.system_settings enable row level security;

-- Drop all old policies to avoid duplicates
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "tasks_select_policy" on public.tasks;
drop policy if exists "submissions_select_policy" on public.submissions;
drop policy if exists "submissions_insert_worker" on public.submissions;
drop policy if exists "commissions_select_policy" on public.referral_commissions;
drop policy if exists "transactions_select_policy" on public.transactions;
drop policy if exists "withdrawals_select_policy" on public.withdrawals;
drop policy if exists "deposits_select_policy" on public.deposit_requests;
drop policy if exists "platform_earnings_select_policy" on public.platform_earnings;
drop policy if exists "fee_earnings_select_policy" on public.withdrawal_fee_earnings;
drop policy if exists "notifications_select_policy" on public.notifications;
drop policy if exists "reads_policy" on public.notification_reads;
drop policy if exists "settings_select_policy" on public.system_settings;

-- A. Profiles Policy
create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (
    auth.uid() = id
    or referred_by = auth.uid()
    or exists (
      select 1 from public.submissions s
      where s.employer_id = auth.uid() and s.worker_id = profiles.id
    )
    or exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  );

-- B. Tasks Policy
create policy "tasks_select_policy"
  on public.tasks for select
  to authenticated
  using (true);

-- C. Submissions Policy
create policy "submissions_select_policy"
  on public.submissions for select
  to authenticated
  using (
    worker_id = auth.uid()
    or employer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "submissions_insert_worker"
  on public.submissions for insert
  to authenticated
  with check (
    worker_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'worker')
  );

-- D. Referral Commissions Policy
create policy "commissions_select_policy"
  on public.referral_commissions for select
  to authenticated
  using (
    referrer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- E. Transactions Policy
create policy "transactions_select_policy"
  on public.transactions for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- F. Withdrawals Policy
create policy "withdrawals_select_policy"
  on public.withdrawals for select
  to authenticated
  using (
    worker_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- G. Deposit Requests Policy
create policy "deposits_select_policy"
  on public.deposit_requests for select
  to authenticated
  using (
    coalesce(user_id, employer_id) = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- H. Platform & Fee Earnings Policies
create policy "platform_earnings_select_policy"
  on public.platform_earnings for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "fee_earnings_select_policy"
  on public.withdrawal_fee_earnings for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- I. Notifications & Settings Policies
create policy "notifications_select_policy"
  on public.notifications for select
  to authenticated
  using (
    target_role = 'all'
    or target_user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and (role = target_role or role = 'admin')
    )
  );

create policy "reads_policy"
  on public.notification_reads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "settings_select_policy"
  on public.system_settings for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 7. DATA SANITATION & BACKFILL
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Backfill unique codes for worker profiles lacking one
  for r in 
    select id, full_name 
    from public.profiles 
    where role = 'worker' 
      and (referral_code is null or referral_code = '' or referral_code = 'TASKLY')
  loop
    update public.profiles
    set referral_code = public.generate_unique_referral_code(r.full_name)
    where id = r.id;
  end loop;

  -- Ensure non-workers (employer, admin) have NULL referral codes & referred_by
  update public.profiles
  set referral_code = null,
      referred_by = null
  where role in ('employer', 'admin');
end;
$$;
