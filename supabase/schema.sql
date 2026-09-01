-- ============================================================================
-- TASKLY FULL DATABASE SCHEMA & MIGRATION SCRIPT
-- ============================================================================
-- Fixes:
-- 1. Tasks status check constraint violations ("tasks_status_check") on approval/completion
-- 2. Worker 5% referral commission auto-calculation & referral_commissions ledger logging
-- 3. Non-recursive, ultra-fast RLS policies avoiding recursion loops
-- 4. Bulletproof user signup trigger with role extraction & referrer linking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- ----------------------------------------------------------------------------

-- A. Profiles (User accounts, balances, roles, referral links)
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

-- D. Referral Commissions Ledger
create table if not exists public.referral_commissions (
  id uuid primary key default uuid_generate_v4(),
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

-- E. Financial Transactions History
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'deposit',
  amount numeric(12,2) not null default 0.00,
  status text not null default 'completed',
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
  amount numeric(12,2) not null default 0.00,
  fee_amount numeric(12,2) not null default 0.00,
  net_amount numeric(12,2) not null default 0.00,
  status text not null default 'pending',
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
  amount numeric(12,2) not null default 0.00,
  payment_method text,
  method text,
  transaction_id text,
  trx_id text,
  sender_number text,
  sender_mobile text,
  status text not null default 'pending',
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
  status text not null default 'completed',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.withdrawal_fee_earnings (
  id uuid primary key default uuid_generate_v4(),
  withdrawal_id uuid references public.withdrawals(id) on delete cascade unique,
  worker_id uuid references public.profiles(id) on delete cascade,
  withdrawal_amount numeric(12,2) not null default 0.00,
  gross_amount numeric(12,2) not null default 0.00,
  fee_rate numeric(5,2) not null default 2.00,
  fee_amount numeric(12,2) not null default 0.00,
  net_amount numeric(12,2) not null default 0.00,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- I. Notifications System
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null default '',
  body text not null default '',
  type text not null default 'announcement',
  target_role text not null default 'all',
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

-- J. System Settings (Rates, platform configs)
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Initial system settings defaults
insert into public.system_settings (key, value, description)
values
  ('referral_commission_rate', '5.00', 'Worker referral commission percentage rate'),
  ('platform_commission_rate', '10.00', 'Platform fee percentage charged on tasks'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal processing fee percentage')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 3. ENSURE COLUMNS EXIST (Idempotent Schema Alignments)
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists full_name text default 'New User';
alter table public.profiles add column if not exists role text default 'worker';
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists earnings numeric(12,2) default 0.00;
alter table public.profiles add column if not exists pending numeric(12,2) default 0.00;
alter table public.profiles add column if not exists spent numeric(12,2) default 0.00;
alter table public.profiles add column if not exists deposited numeric(12,2) default 0.00;

alter table public.tasks add column if not exists category text default 'Micro Task';
alter table public.tasks add column if not exists proof_instructions text default 'Provide proof of completion';
alter table public.tasks add column if not exists max_workers int default 1;
alter table public.tasks add column if not exists slots_total int default 1;
alter table public.tasks add column if not exists slots_filled int default 0;
alter table public.tasks add column if not exists time_limit_minutes int default 60;
alter table public.tasks add column if not exists status text default 'open';

alter table public.submissions add column if not exists worker_name text;
alter table public.submissions add column if not exists proof text default '';
alter table public.submissions add column if not exists proof_text text;
alter table public.submissions add column if not exists proof_url text;
alter table public.submissions add column if not exists proof_file_url text;
alter table public.submissions add column if not exists rejection_reason text;
alter table public.submissions add column if not exists reviewed_at timestamptz;

alter table public.deposit_requests add column if not exists user_id uuid references public.profiles(id) on delete cascade;
alter table public.deposit_requests add column if not exists employer_id uuid references public.profiles(id) on delete cascade;
alter table public.deposit_requests add column if not exists payment_method text;
alter table public.deposit_requests add column if not exists method text;
alter table public.deposit_requests add column if not exists transaction_id text;
alter table public.deposit_requests add column if not exists trx_id text;
alter table public.deposit_requests add column if not exists sender_number text;
alter table public.deposit_requests add column if not exists sender_mobile text;

alter table public.withdrawals add column if not exists fee_amount numeric(12,2) default 0.00;
alter table public.withdrawals add column if not exists net_amount numeric(12,2) default 0.00;
alter table public.withdrawals add column if not exists account_number text;
alter table public.withdrawals add column if not exists account_details text;

-- ----------------------------------------------------------------------------
-- 4. CLEAN & RE-ESTABLISH SAFE CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------
-- This dynamically removes all conflicting, restrictive, or outdated check
-- constraints on `tasks`, `submissions`, `profiles`, `transactions`, etc.
do $$
declare
  r record;
begin
  -- Drop all check constraints on tasks
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.tasks drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop all check constraints on submissions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.submissions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop all check constraints on referral_commissions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.referral_commissions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.referral_commissions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop all check constraints on transactions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.transactions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop all check constraints on profiles
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.profiles drop constraint if exists ' || quote_ident(r.conname);
  end loop;
end $$;

-- Re-add clean, permissive, safe check constraints
alter table public.profiles
  add constraint profiles_role_check check (role in ('worker', 'employer', 'admin')),
  add constraint profiles_earnings_check check (earnings >= 0),
  add constraint profiles_pending_check check (pending >= 0),
  add constraint profiles_spent_check check (spent >= 0),
  add constraint profiles_deposited_check check (deposited >= 0);

-- Tasks check constraints: Allow all legitimate operational statuses
alter table public.tasks
  add constraint tasks_status_check check (status in ('open', 'completed', 'cancelled', 'closed', 'active', 'paused', 'in_progress', 'draft', 'pending')),
  add constraint tasks_reward_check check (reward >= 0),
  add constraint tasks_max_workers_check check (max_workers > 0),
  add constraint tasks_slots_total_check check (slots_total > 0),
  add constraint tasks_slots_filled_check check (slots_filled >= 0);

-- Submissions check constraints
alter table public.submissions
  add constraint submissions_status_check check (status in ('pending', 'approved', 'rejected', 'completed', 'cancelled'));

-- Referral commissions check constraints
alter table public.referral_commissions
  add constraint referral_commissions_amount_check check (commission_amount >= 0),
  add constraint referral_commissions_status_check check (status in ('completed', 'cancelled', 'pending', 'paid'));

-- Transactions check constraints
alter table public.transactions
  add constraint transactions_type_check check (type in ('deposit', 'earning', 'withdrawal', 'escrow_hold', 'escrow_release', 'escrow_refund', 'admin_adjustment', 'spend', 'commission', 'fee', 'referral')),
  add constraint transactions_amount_check check (amount >= 0),
  add constraint transactions_status_check check (status in ('pending', 'completed', 'rejected', 'failed', 'approved'));

-- Drop old trigger before redefining function
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
    select exists(select 1 from public.profiles where upper(trim(referral_code)) = v_code) into v_exists;
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

-- B. User Signup Trigger (Bulletproof Role Extraction & Referrer Linking)
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
  -- 1. Extract Role accurately from all possible metadata paths
  v_role := coalesce(
    new.raw_user_meta_data->>'role',
    new.raw_app_meta_data->>'role',
    'worker'
  );
  v_role := lower(trim(v_role));

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

  -- 3. Process Worker-Only Referral Code & Referrer Lookup
  if v_role = 'worker' then
    v_ref_code := upper(btrim(coalesce(
      new.raw_user_meta_data->>'referral_code',
      new.raw_user_meta_data->>'ref',
      new.raw_user_meta_data->>'referred_by',
      ''
    )));

    if v_ref_code <> '' then
      begin
        select id into v_referrer_id
        from public.profiles
        where upper(trim(referral_code)) = v_ref_code
          and id <> new.id
        limit 1;
      exception when others then
        v_referrer_id := null;
      end;
    end if;

    begin
      v_my_ref_code := public.generate_unique_referral_code(v_full_name);
    exception when others then
      v_my_ref_code := 'WRK' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    end;
  else
    v_my_ref_code := null;
    v_referrer_id := null;
  end if;

  -- 4. Upsert profile safely without ever failing user registration
  begin
    insert into public.profiles (
      id,
      full_name,
      role,
      referral_code,
      referred_by,
      earnings,
      pending,
      spent,
      deposited,
      created_at,
      updated_at
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
      0.00,
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = excluded.role,
      referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
      referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
      updated_at = timezone('utc'::text, now());
  exception when others then
    insert into public.profiles (id, full_name, role)
    values (new.id, v_full_name, v_role)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = excluded.role;
  end;

  return new;
exception when others then
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- C. Robust 5% Worker Referral Commission Engine
create or replace function public.process_referral_commission(
  p_worker_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_amount numeric,
  p_rate numeric default 5.00
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker record;
  v_referrer_id uuid;
  v_commission numeric(12,2);
  v_rate numeric(5,2);
  v_existing_id uuid;
  v_sys_rate text;
begin
  if p_amount is null or p_amount <= 0 then
    return 0.00;
  end if;

  -- 1. Find worker and their referrer
  select id, role, referred_by, full_name into v_worker
  from public.profiles
  where id = p_worker_id;

  if not found or v_worker.referred_by is null or v_worker.referred_by = p_worker_id then
    return 0.00;
  end if;

  v_referrer_id := v_worker.referred_by;

  -- 2. Verify referrer profile exists
  if not exists (select 1 from public.profiles where id = v_referrer_id) then
    return 0.00;
  end if;

  -- 3. Prevent duplicate commission entry for the exact same event
  select id into v_existing_id
  from public.referral_commissions
  where source_type = p_source_type
    and source_id = p_source_id
    and referrer_id = v_referrer_id;

  if found then
    return 0.00;
  end if;

  -- 4. Calculate commission rate (System Setting or default 5.00%)
  begin
    select value into v_sys_rate from public.system_settings where key = 'referral_commission_rate';
    if v_sys_rate is not null and v_sys_rate <> '' then
      v_rate := v_sys_rate::numeric;
    else
      v_rate := coalesce(p_rate, 5.00);
    end if;
  exception when others then
    v_rate := coalesce(p_rate, 5.00);
  end;

  if v_rate <= 0 then
    v_rate := 5.00;
  end if;

  v_commission := round((p_amount * (v_rate / 100.00))::numeric, 2);
  if v_commission <= 0.00 then
    v_commission := 0.01; -- Minimum 1 cent
  end if;

  -- 5. Insert into referral commissions ledger
  insert into public.referral_commissions (
    referrer_id,
    referred_id,
    source_type,
    source_id,
    eligible_amount,
    commission_rate,
    commission_amount,
    status,
    created_at
  )
  values (
    v_referrer_id,
    p_worker_id,
    p_source_type,
    p_source_id,
    p_amount,
    v_rate,
    v_commission,
    'completed',
    timezone('utc'::text, now())
  );

  -- 6. Credit referrer's earnings
  update public.profiles
  set earnings = earnings + v_commission,
      updated_at = timezone('utc'::text, now())
  where id = v_referrer_id;

  -- 7. Log financial transaction for referrer
  insert into public.transactions (
    user_id,
    type,
    amount,
    status,
    meta,
    created_at
  )
  values (
    v_referrer_id,
    'earning',
    v_commission,
    'completed',
    jsonb_build_object(
      'source', 'referral_commission',
      'source_type', p_source_type,
      'source_id', p_source_id,
      'referred_worker_id', p_worker_id,
      'rate', v_rate,
      'task_reward', p_amount
    ),
    timezone('utc'::text, now())
  );

  -- 8. Notify referrer
  insert into public.notifications (
    title,
    body,
    type,
    target_role,
    target_user_id,
    created_at
  )
  values (
    'Referral Bonus Earned! 🎉',
    format('You earned $%s (%s%% commission) from your referred worker.', to_char(v_commission, 'FM999,990.00'), v_rate),
    'referral',
    'worker',
    v_referrer_id,
    timezone('utc'::text, now())
  );

  return v_commission;
exception when others then
  -- Fail-safe return so task approval transaction is never aborted
  return 0.00;
end;
$$;

-- D. Create Task with Escrow Funding
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
  v_caller_id uuid;
  v_slots_count int;
  v_total_cost numeric(12,2);
  v_user_deposited numeric(12,2);
  v_new_task_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  v_slots_count := greatest(coalesce(p_slots, p_max_workers, 1), 1);

  if p_reward <= 0 then
    raise exception 'Reward must be greater than zero.';
  end if;

  v_total_cost := round((p_reward * v_slots_count)::numeric, 2);

  select deposited into v_user_deposited
  from public.profiles
  where id = v_caller_id
  for update;

  if v_user_deposited is null or v_user_deposited < v_total_cost then
    raise exception 'Insufficient deposited balance ($% needed, $% available). Please deposit funds first.',
      to_char(v_total_cost, 'FM999,990.00'), to_char(coalesce(v_user_deposited, 0), 'FM999,990.00');
  end if;

  -- 1. Deduct deposited balance and mark spent
  update public.profiles
  set deposited = deposited - v_total_cost,
      spent = spent + v_total_cost,
      updated_at = timezone('utc'::text, now())
  where id = v_caller_id;

  -- 2. Insert task
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
    status,
    created_at,
    updated_at
  )
  values (
    v_caller_id,
    p_title,
    coalesce(p_category, 'Micro Task'),
    p_description,
    p_proof_instructions,
    p_reward,
    v_slots_count,
    v_slots_count,
    0,
    greatest(coalesce(p_time_limit_minutes, 60), 1),
    'open',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  returning id into v_new_task_id;

  -- 3. Record escrow transaction
  insert into public.transactions (
    user_id,
    type,
    amount,
    status,
    meta,
    created_at
  )
  values (
    v_caller_id,
    'escrow_hold',
    v_total_cost,
    'completed',
    jsonb_build_object(
      'task_id', v_new_task_id,
      'reward', p_reward,
      'slots', v_slots_count,
      'title', p_title
    ),
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
  if not found or v_task.status not in ('open', 'active') then
    raise exception 'Task is no longer available.';
  end if;

  if v_task.employer_id = v_worker_id then
    raise exception 'You cannot submit work on your own task.';
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
    status,
    created_at,
    updated_at
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
    'pending',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  returning id into v_sub_id;

  return v_sub_id;
end;
$$;

-- F. Approve Submission & Release Payment (With 5% Referral Commission & Status Check Protection)
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
  v_max_slots int;
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

  if not found then
    raise exception 'Associated task not found.';
  end if;

  -- 1. Mark submission approved
  update public.submissions
  set status = 'approved',
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- 2. Credit worker earnings
  update public.profiles
  set earnings = earnings + v_task.reward,
      updated_at = timezone('utc'::text, now())
  where id = v_sub.worker_id;

  -- 3. Worker financial transaction
  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_sub.worker_id,
    'earning',
    v_task.reward,
    'completed',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'task_id', v_sub.task_id,
      'task_title', v_task.title
    ),
    timezone('utc'::text, now())
  );

  -- 4. Process Worker Referral Commission (5%)
  perform public.process_referral_commission(
    v_sub.worker_id,
    'task_approval',
    p_submission_id,
    v_task.reward,
    5.00
  );

  -- 5. Update task slot count and mark completed if filled
  select count(*) into v_approved_count
  from public.submissions
  where task_id = v_sub.task_id and status = 'approved';

  v_max_slots := greatest(coalesce(v_task.slots_total, v_task.max_workers, 1), 1);

  if v_approved_count >= v_max_slots then
    update public.tasks
    set slots_filled = v_approved_count,
        status = 'completed',
        updated_at = timezone('utc'::text, now())
    where id = v_sub.task_id;
  else
    update public.tasks
    set slots_filled = v_approved_count,
        updated_at = timezone('utc'::text, now())
    where id = v_sub.task_id;
  end if;

  -- 6. Notify worker
  insert into public.notifications (
    title,
    body,
    type,
    target_role,
    target_user_id,
    created_at
  )
  values (
    'Task Approved! 💰',
    format('Your submission for "%s" was approved. $%s has been added to your earnings.', v_task.title, to_char(v_task.reward, 'FM999,990.00')),
    'task_approved',
    'worker',
    v_sub.worker_id,
    timezone('utc'::text, now())
  );
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

-- G. Reject Submission & Refund Employer
create or replace function public.reject_submission_and_refund(
  p_submission_id uuid,
  p_reason text default 'Submission rejected'
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

  -- 1. Mark rejected
  update public.submissions
  set status = 'rejected',
      rejection_reason = coalesce(p_reason, 'Rejected by employer'),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;

  -- 2. Refund employer deposited balance
  if v_task.reward > 0 then
    update public.profiles
    set deposited = deposited + v_task.reward,
        spent = greatest(spent - v_task.reward, 0),
        updated_at = timezone('utc'::text, now())
    where id = v_sub.employer_id;

    insert into public.transactions (user_id, type, amount, status, meta, created_at)
    values (
      v_sub.employer_id,
      'escrow_refund',
      v_task.reward,
      'completed',
      jsonb_build_object(
        'submission_id', p_submission_id,
        'task_id', v_sub.task_id,
        'reason', p_reason
      ),
      timezone('utc'::text, now())
    );
  end if;

  -- 3. Notify worker
  insert into public.notifications (
    title,
    body,
    type,
    target_role,
    target_user_id,
    created_at
  )
  values (
    'Submission Rejected',
    format('Your submission for "%s" was rejected: %s', coalesce(v_task.title, 'Task'), coalesce(p_reason, 'Did not meet requirements')),
    'task_rejected',
    'worker',
    v_sub.worker_id,
    timezone('utc'::text, now())
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
    status,
    created_at
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
    'pending',
    timezone('utc'::text, now())
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
      spent = spent + p_amount,
      updated_at = timezone('utc'::text, now())
  where id = v_caller_id;

  insert into public.withdrawals (
    worker_id,
    amount,
    fee_amount,
    net_amount,
    method,
    account_number,
    account_details,
    status,
    created_at,
    updated_at
  )
  values (
    v_caller_id,
    p_amount,
    v_fee,
    v_net,
    p_method,
    p_account_details,
    p_account_details,
    'pending',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  returning id into v_w_id;

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_caller_id,
    'withdrawal',
    p_amount,
    'pending',
    jsonb_build_object('withdrawal_id', v_w_id, 'fee', v_fee, 'net', v_net),
    timezone('utc'::text, now())
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
  set deposited = deposited + v_dep.amount,
      updated_at = timezone('utc'::text, now())
  where id = coalesce(v_dep.user_id, v_dep.employer_id);

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    coalesce(v_dep.user_id, v_dep.employer_id),
    'deposit',
    v_dep.amount,
    'completed',
    jsonb_build_object('deposit_request_id', p_deposit_id, 'trx_id', coalesce(v_dep.transaction_id, v_dep.trx_id)),
    timezone('utc'::text, now())
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
      net_amount,
      created_at
    )
    values (
      v_w.id,
      v_w.worker_id,
      v_w.amount,
      v_w.amount,
      2.00,
      v_w.fee_amount,
      v_w.net_amount,
      timezone('utc'::text, now())
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
      spent = greatest(spent - v_w.amount, 0),
      updated_at = timezone('utc'::text, now())
  where id = v_w.worker_id;

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    v_w.worker_id,
    'earning',
    v_w.amount,
    'completed',
    jsonb_build_object('refunded_withdrawal_id', p_withdrawal_id, 'reason', p_reason),
    timezone('utc'::text, now())
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
    update public.profiles set earnings = greatest(0, earnings + p_amount), updated_at = timezone('utc'::text, now()) where id = p_user_id;
  elsif p_field = 'deposited' then
    update public.profiles set deposited = greatest(0, deposited + p_amount), updated_at = timezone('utc'::text, now()) where id = p_user_id;
  else
    raise exception 'Invalid balance field.';
  end if;

  insert into public.transactions (user_id, type, amount, status, meta, created_at)
  values (
    p_user_id,
    'admin_adjustment',
    abs(p_amount),
    'completed',
    jsonb_build_object('field', p_field, 'delta', p_amount, 'reason', p_reason, 'admin_id', auth.uid()),
    timezone('utc'::text, now())
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

  update public.profiles set role = p_role, updated_at = timezone('utc'::text, now()) where id = p_user_id;

  if p_role <> 'worker' then
    update public.profiles set referral_code = null, referred_by = null, updated_at = timezone('utc'::text, now()) where id = p_user_id;
  elsif (select referral_code from public.profiles where id = p_user_id) is null then
    update public.profiles
    set referral_code = public.generate_unique_referral_code(full_name),
        updated_at = timezone('utc'::text, now())
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
    created_by,
    created_at
  )
  values (
    p_title,
    p_message,
    p_type,
    p_target_role,
    p_user_id,
    auth.uid(),
    timezone('utc'::text, now())
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
-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Bulletproof & Non-Recursive)
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
drop policy if exists "profiles_insert_policy" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "tasks_select_policy" on public.tasks;
drop policy if exists "tasks_insert_policy" on public.tasks;
drop policy if exists "tasks_update_policy" on public.tasks;
drop policy if exists "tasks_delete_policy" on public.tasks;
drop policy if exists "submissions_select_policy" on public.submissions;
drop policy if exists "submissions_insert_worker" on public.submissions;
drop policy if exists "submissions_insert_policy" on public.submissions;
drop policy if exists "submissions_update_policy" on public.submissions;
drop policy if exists "commissions_select_policy" on public.referral_commissions;
drop policy if exists "transactions_select_policy" on public.transactions;
drop policy if exists "withdrawals_select_policy" on public.withdrawals;
drop policy if exists "withdrawals_insert_policy" on public.withdrawals;
drop policy if exists "deposits_select_policy" on public.deposit_requests;
drop policy if exists "deposits_insert_policy" on public.deposit_requests;
drop policy if exists "platform_earnings_select_policy" on public.platform_earnings;
drop policy if exists "fee_earnings_select_policy" on public.withdrawal_fee_earnings;
drop policy if exists "notifications_select_policy" on public.notifications;
drop policy if exists "notifications_insert_policy" on public.notifications;
drop policy if exists "notifications_delete_policy" on public.notifications;
drop policy if exists "reads_policy" on public.notification_reads;
drop policy if exists "settings_select_policy" on public.system_settings;

-- A. Profiles Policies
create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_policy"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_policy"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- B. Tasks Policies
create policy "tasks_select_policy"
  on public.tasks for select
  to authenticated, anon
  using (true);

create policy "tasks_insert_policy"
  on public.tasks for insert
  to authenticated
  with check (employer_id = auth.uid());

create policy "tasks_update_policy"
  on public.tasks for update
  to authenticated
  using (
    employer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "tasks_delete_policy"
  on public.tasks for delete
  to authenticated
  using (
    employer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- C. Submissions Policies
create policy "submissions_select_policy"
  on public.submissions for select
  to authenticated
  using (
    worker_id = auth.uid()
    or employer_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "submissions_insert_policy"
  on public.submissions for insert
  to authenticated
  with check (worker_id = auth.uid());

create policy "submissions_update_policy"
  on public.submissions for update
  to authenticated
  using (
    employer_id = auth.uid()
    or worker_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
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

-- F. Withdrawals Policies
create policy "withdrawals_select_policy"
  on public.withdrawals for select
  to authenticated
  using (
    worker_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "withdrawals_insert_policy"
  on public.withdrawals for insert
  to authenticated
  with check (worker_id = auth.uid());

-- G. Deposit Requests Policies
create policy "deposits_select_policy"
  on public.deposit_requests for select
  to authenticated
  using (
    coalesce(user_id, employer_id) = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "deposits_insert_policy"
  on public.deposit_requests for insert
  to authenticated
  with check (coalesce(user_id, employer_id) = auth.uid());

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
    or target_user_id is null
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and (role = target_role or role = 'admin')
    )
  );

create policy "notifications_insert_policy"
  on public.notifications for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "notifications_delete_policy"
  on public.notifications for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
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
-- 7. DATA SANITATION, RE-SYNC & RETROACTIVE COMMISSION BACKFILL
-- ----------------------------------------------------------------------------
do $$
declare
  u record;
  r record;
  s record;
  v_meta_role text;
  v_meta_name text;
  v_ref_code text;
  v_referrer_id uuid;
begin
  -- 1. Sync any existing profiles role and name from auth.users metadata
  for u in select id, raw_user_meta_data, raw_app_meta_data, email from auth.users loop
    v_meta_role := lower(trim(coalesce(
      u.raw_user_meta_data->>'role',
      u.raw_app_meta_data->>'role',
      ''
    )));
    v_meta_name := coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1)
    );

    if v_meta_role in ('worker', 'employer', 'admin') then
      update public.profiles
      set role = v_meta_role,
          full_name = coalesce(nullif(full_name, 'New User'), v_meta_name, full_name)
      where id = u.id and role <> v_meta_role;
    end if;

    -- 2. Backfill missing referred_by links from signup metadata if missing
    v_ref_code := upper(trim(coalesce(
      u.raw_user_meta_data->>'referral_code',
      u.raw_user_meta_data->>'ref',
      u.raw_user_meta_data->>'referred_by',
      ''
    )));

    if v_ref_code <> '' then
      select id into v_referrer_id
      from public.profiles
      where upper(trim(referral_code)) = v_ref_code
        and id <> u.id
      limit 1;

      if v_referrer_id is not null then
        update public.profiles
        set referred_by = v_referrer_id
        where id = u.id and (referred_by is null or referred_by <> v_referrer_id);
      end if;
    end if;
  end loop;

  -- 3. Backfill unique referral codes for worker profiles lacking one
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

  -- 4. Clean non-worker referral code columns
  update public.profiles
  set referral_code = null,
      referred_by = null
  where role in ('employer', 'admin');

  -- 5. Sanitize any legacy task status values to standard 'open' / 'completed'
  update public.tasks
  set status = 'open'
  where status is null or status not in ('open', 'completed', 'cancelled', 'closed', 'active', 'paused', 'in_progress', 'draft', 'pending');

  -- 6. Retroactively credit missing referral commissions for already-approved submissions
  for s in
    select sub.id as sub_id, sub.worker_id, t.reward, p.referred_by
    from public.submissions sub
    join public.tasks t on t.id = sub.task_id
    join public.profiles p on p.id = sub.worker_id
    where sub.status = 'approved'
      and p.referred_by is not null
      and not exists (
        select 1 from public.referral_commissions rc
        where rc.source_type = 'task_approval'
          and rc.source_id = sub.id
      )
  loop
    perform public.process_referral_commission(
      s.worker_id,
      'task_approval',
      s.sub_id,
      s.reward,
      5.00
    );
  end loop;
end;
$$;
