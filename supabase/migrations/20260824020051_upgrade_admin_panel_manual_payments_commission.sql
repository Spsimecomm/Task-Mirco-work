/*
# Taskly Platform Upgrade — Admin Panel, Manual Payments, Commission System

## Overview
Upgrades the Taskly schema with: admin role support, manual deposit requests (bKash/Nagad with TrxID), platform commission tracking on task approvals, admin RPC functions for approving/rejecting deposits and withdrawals, and admin-scoped RLS policies for managing all users and transactions.

## New Tables
1. `deposit_requests` — Manual payment requests from employers. Fields: employer_id, amount, method (bkash/nagad), sender_mobile, trx_id, status (pending/approved/rejected), reviewed_at, reviewed_by, rejection_reason. Workers submit TrxID + sender number; admin approves to credit balance.
2. `platform_earnings` — Tracks platform commission on each approved submission. Fields: submission_id, task_id, worker_id, employer_id, reward_amount, commission_rate, commission_amount, created_at.

## Modified Tables
- `profiles` — role check constraint updated to allow 'admin' in addition to 'worker' and 'employer'.
- `withdrawals` — status constraint updated to include 'completed' (admin marks as paid). No data loss — existing 'approved' values remain valid.

## Modified Functions
- `approve_submission` — Now deducts a 10% platform commission from the worker's reward. Worker receives 90% of reward; platform_earnings row records the 10% commission. Employer still pays full reward.

## New RPC Functions (all SECURITY DEFINER)
- `request_deposit(p_amount, p_method, p_sender_mobile, p_trx_id)` — Creates a pending deposit request (does NOT credit balance; admin must approve).
- `admin_approve_deposit(p_deposit_id)` — Admin-only. Credits employer balance, marks deposit approved, logs transaction. Prevents double-approval.
- `admin_reject_deposit(p_deposit_id, p_reason)` — Admin-only. Marks deposit rejected with reason.
- `admin_approve_withdrawal(p_withdrawal_id)` — Admin-only. Marks withdrawal as completed (paid out).
- `admin_reject_withdrawal(p_withdrawal_id, p_reason)` — Admin-only. Refunds worker earnings, marks rejected.

## Security (RLS)
- `deposit_requests`: SELECT for owner (employer) or admin. No direct INSERT/UPDATE/DELETE — via RPC.
- `platform_earnings`: SELECT for admin only. No direct INSERT/UPDATE/DELETE — via RPC (approve_submission).
- `withdrawals`: SELECT for owner (worker) or admin. No direct UPDATE — via RPC.
- `profiles`: SELECT for owner or admin (so admin can view all users).
- `tasks`: SELECT for open tasks, owner, or admin.
- `submissions`: SELECT for worker, employer, or admin.
- `transactions`: SELECT for owner or admin.
- All policies use auth.uid(), scoped to authenticated.

## Important Notes
1. Commission rate is 10% (configurable in the approve_submission function).
2. The old `deposit_funds` RPC is kept for backward compatibility but the new flow uses `request_deposit` + admin approval.
3. Admin users must have role='admin' in their profile. Set manually via SQL: `UPDATE profiles SET role='admin' WHERE id = '<uuid>';`
4. All admin RPC functions verify the caller's role is 'admin' before proceeding.
*/

-- ----------------------------------------------------------------------------
-- 1. Update profiles role constraint to allow 'admin'
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('worker', 'employer', 'admin'));

-- ----------------------------------------------------------------------------
-- 2. Update withdrawals status constraint to include 'completed'
-- ----------------------------------------------------------------------------
alter table public.withdrawals drop constraint if exists withdrawals_status_check;
alter table public.withdrawals add constraint withdrawals_status_check check (status in ('pending', 'approved', 'rejected', 'completed'));

-- ----------------------------------------------------------------------------
-- 3. Create deposit_requests table
-- ----------------------------------------------------------------------------
create table if not exists public.deposit_requests (
  id                uuid primary key default gen_random_uuid(),
  employer_id       uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(12,2) not null check (amount > 0),
  method            text not null check (method in ('bkash', 'nagad')),
  sender_mobile     text not null,
  trx_id            text not null,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles(id) on delete set null,
  rejection_reason  text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_deposit_requests_employer on public.deposit_requests(employer_id);
create index if not exists idx_deposit_requests_status on public.deposit_requests(status);

-- ----------------------------------------------------------------------------
-- 4. Create platform_earnings table
-- ----------------------------------------------------------------------------
create table if not exists public.platform_earnings (
  id                uuid primary key default gen_random_uuid(),
  submission_id     uuid not null references public.submissions(id) on delete cascade,
  task_id           uuid not null references public.tasks(id) on delete cascade,
  worker_id         uuid not null references public.profiles(id) on delete cascade,
  employer_id       uuid not null references public.profiles(id) on delete cascade,
  reward_amount     numeric(12,2) not null,
  commission_rate   numeric(5,2) not null default 10.00,
  commission_amount numeric(12,2) not null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_platform_earnings_task on public.platform_earnings(task_id);

-- ----------------------------------------------------------------------------
-- 5. Enable RLS on new tables
-- ----------------------------------------------------------------------------
alter table public.deposit_requests  enable row level security;
alter table public.platform_earnings enable row level security;

-- ----------------------------------------------------------------------------
-- 6. Update RLS policies — allow admin to read all tables
-- ----------------------------------------------------------------------------
-- Helper: admin check via subquery (used in policies)
-- profiles: owner or admin
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- tasks: open, own, or admin
drop policy if exists "tasks_select_open_or_own" on public.tasks;
create policy "tasks_select_open_or_own_or_admin"
  on public.tasks for select
  to authenticated
  using (
    status = 'open'
    or employer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- submissions: worker, employer, or admin
drop policy if exists "submissions_select_own" on public.submissions;
create policy "submissions_select_own_or_admin"
  on public.submissions for select
  to authenticated
  using (
    worker_id = auth.uid()
    or employer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- transactions: owner or admin
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own_or_admin"
  on public.transactions for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- withdrawals: owner or admin
drop policy if exists "withdrawals_select_own" on public.withdrawals;
create policy "withdrawals_select_own_or_admin"
  on public.withdrawals for select
  to authenticated
  using (
    worker_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- deposit_requests: owner or admin
drop policy if exists "deposit_requests_select_own_or_admin" on public.deposit_requests;
create policy "deposit_requests_select_own_or_admin"
  on public.deposit_requests for select
  to authenticated
  using (
    employer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- platform_earnings: admin only
drop policy if exists "platform_earnings_select_admin" on public.platform_earnings;
create policy "platform_earnings_select_admin"
  on public.platform_earnings for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 7. Add new tables to realtime publication
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.deposit_requests;
alter publication supabase_realtime add table public.platform_earnings;

-- ----------------------------------------------------------------------------
-- 8. RPC: request_deposit — employer submits manual payment proof
-- ----------------------------------------------------------------------------
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
  v_role text;
  v_request_id uuid;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'employer' then
    raise exception 'Only employers can request deposits.';
  end if;

  if p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero.';
  end if;

  if p_method not in ('bkash', 'nagad') then
    raise exception 'Payment method must be bKash or Nagad.';
  end if;

  insert into public.deposit_requests (employer_id, amount, method, sender_mobile, trx_id)
  values (auth.uid(), p_amount, p_method, p_sender_mobile, p_trx_id)
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. RPC: admin_approve_deposit — admin credits employer balance
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
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. RPC: admin_reject_deposit — admin rejects with reason
-- ----------------------------------------------------------------------------
create or replace function public.admin_reject_deposit(p_deposit_id uuid, p_reason text)
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
    raise exception 'Only admins can reject deposits.';
  end if;

  update public.deposit_requests
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_reason
  where id = p_deposit_id and status = 'pending';

  if not found then
    raise exception 'Deposit request not found or already reviewed.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 11. RPC: admin_approve_withdrawal — admin marks withdrawal as completed
-- ----------------------------------------------------------------------------
create or replace function public.admin_approve_withdrawal(p_withdrawal_id uuid)
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
    raise exception 'Only admins can approve withdrawals.';
  end if;

  update public.withdrawals
  set status = 'completed'
  where id = p_withdrawal_id and status = 'pending';

  if not found then
    raise exception 'Withdrawal not found or already processed.';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 12. RPC: admin_reject_withdrawal — admin rejects, refunds worker earnings
-- ----------------------------------------------------------------------------
create or replace function public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_role text;
  v_withdrawal public.withdrawals%rowtype;
begin
  select role into v_admin_role from public.profiles where id = auth.uid();
  if v_admin_role is distinct from 'admin' then
    raise exception 'Only admins can reject withdrawals.';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Withdrawal not found.';
  end if;
  if v_withdrawal.status <> 'pending' then
    raise exception 'This withdrawal has already been processed.';
  end if;

  update public.withdrawals
  set status = 'rejected'
  where id = p_withdrawal_id;

  -- refund worker earnings
  update public.profiles
  set earnings = earnings + v_withdrawal.amount,
      spent   = spent - v_withdrawal.amount
  where id = v_withdrawal.worker_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13. Update approve_submission to deduct 10% platform commission
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

  -- worker receives reward minus commission
  update public.profiles
  set earnings = earnings + v_worker_payout,
      pending  = pending - v_reward
  where id = v_sub.worker_id;

  -- employer pays full reward
  update public.profiles
  set pending = pending - v_reward,
      spent   = spent + v_reward
  where id = auth.uid();

  -- record platform commission
  insert into public.platform_earnings (submission_id, task_id, worker_id, employer_id, reward_amount, commission_rate, commission_amount)
  values (p_submission_id, v_sub.task_id, v_sub.worker_id, auth.uid(), v_reward, v_commission_rate, v_commission);

  insert into public.transactions (user_id, type, amount, status, meta)
  values
    (v_sub.worker_id, 'earning', v_worker_payout, 'completed', jsonb_build_object('submission_id', p_submission_id, 'commission', v_commission)),
    (auth.uid(), 'spend', v_reward, 'completed', jsonb_build_object('submission_id', p_submission_id));
end;
$$;

-- ----------------------------------------------------------------------------
-- 14. Grant execute on new RPCs to authenticated
-- ----------------------------------------------------------------------------
grant execute on function public.request_deposit(numeric, text, text, text) to authenticated;
grant execute on function public.admin_approve_deposit(uuid) to authenticated;
grant execute on function public.admin_reject_deposit(uuid, text) to authenticated;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
