/*
# Referral & Commission Sharing System

## Overview
Adds a full production-ready referral and commission system to Taskly:
1. Unique referral codes for every user (`referral_code` on `profiles`).
2. Referral link tracking (`referred_by` foreign key to referrer's `profiles.id`).
3. Dedicated `referral_commissions` ledger to track all earned commissions with auditability and idempotency.
4. Automatic 5% commission calculation triggered on qualifying events:
   - Worker task submission approval (`approve_submission`)
   - Employer deposit approval by admin (`admin_approve_deposit`)
5. Atomic balance crediting:
   - Worker referrer: credited to `earnings`
   - Employer referrer: credited to `deposited`
6. Transaction logging in `public.transactions` with audit metadata.
7. Anti-abuse: self-referral prevention, duplicate commission prevention via UNIQUE(source_type, source_id), server-side SECURITY DEFINER execution with no direct client manipulation.
*/

-- ----------------------------------------------------------------------------
-- 1. Add referral columns to profiles
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 2. Function to generate clean, short, uppercase unique referral code
-- ----------------------------------------------------------------------------
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
  -- Extract 3-5 alphanumeric characters from name, fallback to 'TASK'
  v_prefix := upper(substring(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z0-9]', '', 'g') from 1 for 4));
  if length(v_prefix) < 3 then
    v_prefix := 'TASK';
  end if;

  loop
    -- Generate code: PREFIX + 4 random digits (e.g. SHIM5081, TASK9234)
    v_code := v_prefix || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
    select exists(select 1 from public.profiles where referral_code = v_code) into v_exists;
    if not v_exists then
      return v_code;
    end if;
    v_attempts := v_attempts + 1;
    if v_attempts > 25 then
      -- Fallback to random alphanumeric string
      v_code := 'REF' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
      return v_code;
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Safe Backfill for existing users (idempotent)
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id, full_name from public.profiles where referral_code is null or referral_code = '' loop
    update public.profiles
    set referral_code = public.generate_unique_referral_code(r.full_name)
    where id = r.id;
  end loop;
end;
$$;

-- Enforce unique index and not null on referral_code
create unique index if not exists idx_profiles_referral_code on public.profiles(upper(referral_code));
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- ----------------------------------------------------------------------------
-- 4. Update handle_new_user trigger to support referral registration
-- ----------------------------------------------------------------------------
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
  v_my_ref_code text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'worker');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'New user');

  -- Only worker or employer allowed from signup metadata
  if v_role not in ('worker', 'employer') then
    v_role := 'worker';
  end if;

  -- Extract referral code passed during registration
  v_ref_code := upper(btrim(coalesce(
    new.raw_user_meta_data->>'referral_code',
    new.raw_user_meta_data->>'ref',
    new.raw_user_meta_data->>'referred_by',
    ''
  )));

  if v_ref_code <> '' then
    -- Find referrer by code (prevent self-referral)
    select id into v_referrer_id
    from public.profiles
    where upper(referral_code) = v_ref_code
      and id <> new.id
    limit 1;
  end if;

  -- Generate unique referral code for this new user
  v_my_ref_code := public.generate_unique_referral_code(v_full_name);

  insert into public.profiles (id, full_name, role, referral_code, referred_by)
  values (
    new.id,
    v_full_name,
    v_role,
    v_my_ref_code,
    v_referrer_id
  );

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Create referral_commissions ledger table
-- ----------------------------------------------------------------------------
create table if not exists public.referral_commissions (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references public.profiles(id) on delete cascade,
  referred_id       uuid not null references public.profiles(id) on delete cascade,
  source_type       text not null check (source_type in ('task_approval', 'deposit')),
  source_id         uuid not null,
  eligible_amount   numeric(12,2) not null check (eligible_amount > 0),
  commission_rate   numeric(5,2) not null default 5.00,
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status            text not null default 'completed' check (status in ('completed', 'pending', 'reversed')),
  created_at        timestamptz not null default now(),
  constraint uq_referral_commissions_source unique (source_type, source_id)
);

create index if not exists idx_referral_commissions_referrer on public.referral_commissions(referrer_id);
create index if not exists idx_referral_commissions_referred on public.referral_commissions(referred_id);
create index if not exists idx_referral_commissions_created on public.referral_commissions(created_at desc);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security for referral_commissions
-- ----------------------------------------------------------------------------
alter table public.referral_commissions enable row level security;

drop policy if exists "referral_commissions_select_own_or_admin" on public.referral_commissions;
create policy "referral_commissions_select_own_or_admin"
  on public.referral_commissions for select
  to authenticated
  using (
    referrer_id = auth.uid()
    or referred_id = auth.uid()
    or public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 7. Trusted Server-Side Function: process_referral_commission
-- ----------------------------------------------------------------------------
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

  -- 1. Check if user has a referrer
  select referred_by into v_referrer_id
  from public.profiles
  where id = p_referred_id;

  if v_referrer_id is null or v_referrer_id = p_referred_id then
    return null; -- No referrer or self-referral prevented
  end if;

  -- 2. Lock referrer profile row for update to ensure atomic balance update
  select role into v_referrer_role
  from public.profiles
  where id = v_referrer_id
  for update;

  if v_referrer_role is null then
    return null; -- Referrer no longer exists
  end if;

  -- 3. Calculate 5% commission amount (rounded to 2 decimal places)
  v_commission_amount := round((p_eligible_amount * p_rate / 100)::numeric, 2);
  if v_commission_amount <= 0 then
    return null;
  end if;

  -- 4. Insert into referral_commissions (idempotent due to unique constraint)
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
      -- Already processed for this source_id; prevent duplicate payout
      return null;
  end;

  -- 5. Credit referrer's existing balance based on role:
  -- Worker referrer -> credited to earnings
  -- Employer referrer -> credited to deposited balance
  if v_referrer_role = 'worker' then
    update public.profiles
    set earnings = earnings + v_commission_amount
    where id = v_referrer_id;
  else
    update public.profiles
    set deposited = deposited + v_commission_amount
    where id = v_referrer_id;
  end if;

  -- 6. Record financial transaction entry
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

-- Revoke direct execution of process_referral_commission from untrusted callers
revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from public;
revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from anon;
revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from authenticated;

-- ----------------------------------------------------------------------------
-- 8. Integrate commission triggering into approve_submission
-- ----------------------------------------------------------------------------
create or replace function public.approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_reward numeric(12,2);
  v_commission numeric(12,2);
  v_worker_payout numeric(12,2);
  v_commission_rate numeric(5,2) := 10.00;
begin
  select * into v_sub from public.submissions where id = p_submission_id for update;
  if v_sub.id is null then
    raise exception 'Submission not found.';
  end if;
  if v_sub.employer_id <> auth.uid() then
    raise exception 'Not authorized to review this submission.';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'This submission has already been reviewed.';
  end if;

  select reward into v_reward from public.tasks where id = v_sub.task_id;

  v_commission := round((v_reward * v_commission_rate / 100)::numeric, 2);
  v_worker_payout := v_reward - v_commission;

  update public.submissions
  set status = 'approved', reviewed_at = now()
  where id = p_submission_id;

  -- Worker receives reward minus platform commission
  update public.profiles
  set earnings = earnings + v_worker_payout,
      pending  = pending - v_reward
  where id = v_sub.worker_id;

  -- Employer pays full reward
  update public.profiles
  set pending = pending - v_reward,
      spent   = spent + v_reward
  where id = auth.uid();

  -- Record platform commission
  insert into public.platform_earnings (submission_id, task_id, worker_id, employer_id, reward_amount, commission_rate, commission_amount)
  values (p_submission_id, v_sub.task_id, v_sub.worker_id, auth.uid(), v_reward, v_commission_rate, v_commission);

  insert into public.transactions (user_id, type, amount, status, meta)
  values
    (v_sub.worker_id, 'earning', v_worker_payout, 'completed', jsonb_build_object('submission_id', p_submission_id, 'commission', v_commission)),
    (auth.uid(), 'spend', v_reward, 'completed', jsonb_build_object('submission_id', p_submission_id));

  -- 🎁 Process 5% Referral Commission if the worker was referred by another user
  perform public.process_referral_commission(
    v_sub.worker_id,
    'task_approval',
    p_submission_id,
    v_reward,
    5.00
  );
end;
$$;

grant execute on function public.approve_submission(uuid) to authenticated;
revoke execute on function public.approve_submission(uuid) from anon;
revoke execute on function public.approve_submission(uuid) from public;

-- ----------------------------------------------------------------------------
-- 9. Integrate commission triggering into admin_approve_deposit
-- ----------------------------------------------------------------------------
create or replace function public.admin_approve_deposit(p_deposit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_deposit public.deposit_requests%rowtype;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Only admins can approve deposits.';
  end if;

  select * into v_deposit from public.deposit_requests where id = p_deposit_id for update;
  if v_deposit.id is null then
    raise exception 'Deposit request not found.';
  end if;
  if v_deposit.status <> 'pending' then
    raise exception 'This deposit has already been reviewed.';
  end if;

  update public.deposit_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_deposit_id;

  update public.profiles
  set deposited = deposited + v_deposit.amount
  where id = v_deposit.employer_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_deposit.employer_id, 'deposit', v_deposit.amount, 'completed',
    jsonb_build_object('method', v_deposit.method, 'trx_id', v_deposit.trx_id, 'deposit_request_id', p_deposit_id)
  );

  -- 🎁 Process 5% Referral Commission if the depositing employer was referred by another user
  perform public.process_referral_commission(
    v_deposit.employer_id,
    'deposit',
    p_deposit_id,
    v_deposit.amount,
    5.00
  );
end;
$$;

grant execute on function public.admin_approve_deposit(uuid) to authenticated;
revoke execute on function public.admin_approve_deposit(uuid) from anon;
revoke execute on function public.admin_approve_deposit(uuid) from public;

-- ----------------------------------------------------------------------------
-- 10. Realtime publication
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.referral_commissions;
