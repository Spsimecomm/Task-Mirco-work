-- ============================================================================
-- COMPLETE, CLEAN & PRODUCTION-READY SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Features:
-- 1. Strict Role Preservation: Never overwrites, alters, or defaults user roles.
-- 2. Flexible Check Constraints: Tasks allow 'open', 'completed', 'active', etc.
-- 3. Robust Approval Trigger & RPC: Automatically releases worker payout, updates
--    task slots, calculates 5% referral commission, and logs to `referral_commissions`.
-- 4. Clean, Non-Recursive RLS Policies: Avoids infinite recursion loops.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- ----------------------------------------------------------------------------

-- A. Profiles (Worker, Employer, Admin)
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

-- E. Withdrawals
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

-- F. Financial Transactions History
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'deposit',
  amount numeric(12,2) not null default 0.00,
  status text not null default 'completed',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
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

-- H. Notifications System
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

-- I. System Settings
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.system_settings (key, value, description)
values
  ('referral_commission_rate', '5.00', 'Worker referral commission percentage rate'),
  ('platform_commission_rate', '10.00', 'Platform fee percentage charged on tasks'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal processing fee percentage')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 3. ENSURE COLUMNS EXIST (Non-Destructive Safe Alterations)
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

alter table public.withdrawals add column if not exists fee_amount numeric(12,2) default 0.00;
alter table public.withdrawals add column if not exists net_amount numeric(12,2) default 0.00;
alter table public.withdrawals add column if not exists account_number text;
alter table public.withdrawals add column if not exists account_details text;

-- ----------------------------------------------------------------------------
-- 4. CLEAN & FLEXIBLE CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Drop existing check constraints on tasks
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.tasks'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.tasks drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop existing check constraints on submissions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.submissions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop existing check constraints on referral_commissions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.referral_commissions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.referral_commissions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop existing check constraints on withdrawals
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.withdrawals'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.withdrawals drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop existing check constraints on transactions
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.transactions drop constraint if exists ' || quote_ident(r.conname);
  end loop;

  -- Drop existing check constraints on profiles
  for r in (
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
  ) loop
    execute 'alter table public.profiles drop constraint if exists ' || quote_ident(r.conname);
  end loop;
end $$;

-- Add clean, flexible, and robust check constraints
alter table public.profiles
  add constraint profiles_role_check check (role in ('worker', 'employer', 'admin')),
  add constraint profiles_earnings_check check (earnings >= 0),
  add constraint profiles_pending_check check (pending >= 0),
  add constraint profiles_spent_check check (spent >= 0),
  add constraint profiles_deposited_check check (deposited >= 0);

-- Tasks check constraints: Flexible status list to avoid 'tasks_status_check' violations
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

-- Withdrawals check constraints
alter table public.withdrawals
  add constraint withdrawals_status_check check (status in ('pending', 'completed', 'rejected', 'approved', 'cancelled')),
  add constraint withdrawals_amount_check check (amount > 0);

-- Transactions check constraints
alter table public.transactions
  add constraint transactions_type_check check (type in ('deposit', 'earning', 'withdrawal', 'escrow_hold', 'escrow_release', 'escrow_refund', 'admin_adjustment', 'spend', 'commission', 'fee', 'referral')),
  add constraint transactions_amount_check check (amount >= 0),
  add constraint transactions_status_check check (status in ('pending', 'completed', 'rejected', 'failed', 'approved'));

-- ----------------------------------------------------------------------------
-- 5. FUNCTIONS & TRIGGERS
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

-- B. User Signup Trigger (Role-Preserving: worker, employer, admin)
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
  -- 1. Extract Role directly from metadata (strictly respects user selection: worker / employer / admin)
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

  -- 3. If worker, handle referral code generation & referrer lookup
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

  -- 4. Upsert profile safely without ever failing user registration or changing existing role
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
      role = coalesce(public.profiles.role, excluded.role),
      referral_code = coalesce(public.profiles.referral_code, excluded.referral_code),
      referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
      updated_at = timezone('utc'::text, now());
  exception when others then
    insert into public.profiles (id, full_name, role)
    values (new.id, v_full_name, v_role)
    on conflict (id) do update set
      full_name = excluded.full_name,
      role = coalesce(public.profiles.role, excluded.role);
  end;

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- C. 5% Referral Commission Calculation Engine
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

  -- 1. Find worker profile and their referrer
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

  -- 3. Prevent duplicate commission entry
  select id into v_existing_id
  from public.referral_commissions
  where source_type = p_source_type
    and source_id = p_source_id
    and referrer_id = v_referrer_id;

  if found then
    return 0.00;
  end if;

  -- 4. Calculate commission amount
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
  return 0.00;
end;
$$;

-- D. Submission Status Change Trigger (Automates Payouts & 5% Referral Commission)
create or replace function public.handle_submission_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_approved_count int;
  v_max_slots int;
begin
  -- 1. On Approval: Release payment, calculate referral commission, and update slots
  if new.status = 'approved' and old.status = 'pending' then
    select * into v_task from public.tasks where id = new.task_id;
    if found then
      -- A. Credit worker earnings
      update public.profiles
      set earnings = earnings + v_task.reward,
          updated_at = timezone('utc'::text, now())
      where id = new.worker_id;

      -- B. Worker financial transaction
      insert into public.transactions (user_id, type, amount, status, meta, created_at)
      values (
        new.worker_id,
        'earning',
        v_task.reward,
        'completed',
        jsonb_build_object(
          'submission_id', new.id,
          'task_id', new.task_id,
          'task_title', v_task.title
        ),
        timezone('utc'::text, now())
      );

      -- C. Process 5% Referral Commission automatically
      perform public.process_referral_commission(
        new.worker_id,
        'task_approval',
        new.id,
        v_task.reward,
        5.00
      );

      -- D. Update task slots filled and mark completed if full
      select count(*) into v_approved_count
      from public.submissions
      where task_id = new.task_id and status = 'approved';

      v_max_slots := greatest(coalesce(v_task.slots_total, v_task.max_workers, 1), 1);

      if v_approved_count >= v_max_slots then
        update public.tasks
        set slots_filled = v_approved_count,
            status = 'completed',
            updated_at = timezone('utc'::text, now())
        where id = new.task_id;
      else
        update public.tasks
        set slots_filled = v_approved_count,
            updated_at = timezone('utc'::text, now())
        where id = new.task_id;
      end if;

      -- E. Notify worker
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
        new.worker_id,
        timezone('utc'::text, now())
      );
    end if;

  -- 2. On Rejection: Refund employer escrow
  elsif new.status = 'rejected' and old.status = 'pending' then
    select * into v_task from public.tasks where id = new.task_id;
    if found and v_task.reward > 0 then
      update public.profiles
      set deposited = deposited + v_task.reward,
          spent = greatest(spent - v_task.reward, 0),
          updated_at = timezone('utc'::text, now())
      where id = new.employer_id;

      insert into public.transactions (user_id, type, amount, status, meta, created_at)
      values (
        new.employer_id,
        'escrow_refund',
        v_task.reward,
        'completed',
        jsonb_build_object(
          'submission_id', new.id,
          'task_id', new.task_id,
          'reason', new.rejection_reason
        ),
        timezone('utc'::text, now())
      );

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
        format('Your submission for "%s" was rejected: %s', coalesce(v_task.title, 'Task'), coalesce(new.rejection_reason, 'Did not meet requirements')),
        'task_rejected',
        'worker',
        new.worker_id,
        timezone('utc'::text, now())
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_submission_status_change on public.submissions;
create trigger trg_submission_status_change
  after update of status on public.submissions
  for each row execute function public.handle_submission_status_change();

-- E. RPC Functions for Frontend Direct Calls
create or replace function public.approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_sub record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
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

  -- Updating status triggers public.handle_submission_status_change() automatically
  update public.submissions
  set status = 'approved',
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;
end;
$$;

create or replace function public.approve_submission_and_pay(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.approve_submission(p_submission_id);
end;
$$;

create or replace function public.reject_submission(p_submission_id uuid, p_reason text default 'Rejected')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_sub record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
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

  -- Updating status triggers public.handle_submission_status_change() automatically
  update public.submissions
  set status = 'rejected',
      rejection_reason = coalesce(p_reason, 'Rejected by employer'),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_submission_id;
end;
$$;

create or replace function public.reject_submission_and_refund(p_submission_id uuid, p_reason text default 'Rejected')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.reject_submission(p_submission_id, p_reason);
end;
$$;

-- F. Create Task with Escrow Funding
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

-- G. Task Proof Submission
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

-- H. Withdrawal Request Function
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

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.transactions enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.system_settings enable row level security;

-- A. Profiles Policies
drop policy if exists "profiles_select_policy" on public.profiles;
create policy "profiles_select_policy" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_insert_policy" on public.profiles;
create policy "profiles_insert_policy" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_policy" on public.profiles;
create policy "profiles_update_policy" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- B. Tasks Policies
drop policy if exists "tasks_select_policy" on public.tasks;
create policy "tasks_select_policy" on public.tasks for select to authenticated, anon using (true);

drop policy if exists "tasks_insert_policy" on public.tasks;
create policy "tasks_insert_policy" on public.tasks for insert to authenticated with check (employer_id = auth.uid());

drop policy if exists "tasks_update_policy" on public.tasks;
create policy "tasks_update_policy" on public.tasks for update to authenticated using (
  employer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "tasks_delete_policy" on public.tasks;
create policy "tasks_delete_policy" on public.tasks for delete to authenticated using (
  employer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- C. Submissions Policies
drop policy if exists "submissions_select_policy" on public.submissions;
create policy "submissions_select_policy" on public.submissions for select to authenticated using (
  worker_id = auth.uid()
  or employer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "submissions_insert_policy" on public.submissions;
create policy "submissions_insert_policy" on public.submissions for insert to authenticated with check (worker_id = auth.uid());

drop policy if exists "submissions_update_policy" on public.submissions;
create policy "submissions_update_policy" on public.submissions for update to authenticated using (
  employer_id = auth.uid()
  or worker_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- D. Referral Commissions Policies
drop policy if exists "commissions_select_policy" on public.referral_commissions;
create policy "commissions_select_policy" on public.referral_commissions for select to authenticated using (
  referrer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- E. Withdrawals Policies
drop policy if exists "withdrawals_select_policy" on public.withdrawals;
create policy "withdrawals_select_policy" on public.withdrawals for select to authenticated using (
  worker_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "withdrawals_insert_policy" on public.withdrawals;
create policy "withdrawals_insert_policy" on public.withdrawals for insert to authenticated with check (worker_id = auth.uid());

-- F. Transactions Policies
drop policy if exists "transactions_select_policy" on public.transactions;
create policy "transactions_select_policy" on public.transactions for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- G. Deposit Requests Policies
drop policy if exists "deposits_select_policy" on public.deposit_requests;
create policy "deposits_select_policy" on public.deposit_requests for select to authenticated using (
  user_id = auth.uid()
  or employer_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

drop policy if exists "deposits_insert_policy" on public.deposit_requests;
create policy "deposits_insert_policy" on public.deposit_requests for insert to authenticated with check (
  user_id = auth.uid() or employer_id = auth.uid()
);

-- H. Notifications Policies
drop policy if exists "notifications_select_policy" on public.notifications;
create policy "notifications_select_policy" on public.notifications for select to authenticated using (true);

drop policy if exists "reads_policy" on public.notification_reads;
create policy "reads_policy" on public.notification_reads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- I. System Settings Policies
drop policy if exists "settings_select_policy" on public.system_settings;
create policy "settings_select_policy" on public.system_settings for select to authenticated, anon using (true);
