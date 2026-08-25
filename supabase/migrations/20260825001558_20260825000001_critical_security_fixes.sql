/*
# Critical Security Fixes

## Overview
This migration addresses five critical and high-priority security issues
identified in the Taskly security audit:

1. **Prevent admin escalation at signup** — The `handle_new_user()` trigger
   now rejects `admin` from user metadata. Only `worker` or `employer` are
   accepted; any other value (including `admin`) defaults to `worker`.
   Admin role can only be assigned via a service-role SQL query.

2. **Disable deposit_funds bypass** — The old `deposit_funds` RPC directly
   credited an employer's balance with no admin approval. All EXECUTE grants
   are revoked from PUBLIC, anon, and authenticated. The correct flow
   (request_deposit → admin_approve_deposit) remains untouched.

3. **Fix proof_url XSS** — `submit_task_proof` now validates that `proof_url`
   (when provided) starts with `http://` or `https://`. This prevents
   `javascript:`, `data:`, and other unsafe URI schemes from being stored
   and later rendered as clickable links in the employer review queue.

4. **Secure request_withdrawal** — The function now:
     - Requires the caller's role to be `worker`
     - Enforces a minimum withdrawal amount of $2.00
     - Validates `p_method` is `bkash` or `nagad`
     - Requires non-empty `p_account_details`
     - Continues to compute the 2% fee server-side
     - Continues to use `FOR UPDATE` row locking on the profile

5. **Duplicate deposit TrxID prevention** — A UNIQUE constraint is added
   to `deposit_requests.trx_id` so the same transaction ID cannot be
   submitted more than once.

## Modified Functions
- `handle_new_user()` — role whitelist (worker/employer only)
- `submit_task_proof()` — proof_url scheme validation
- `request_withdrawal()` — full input validation + role check

## Modified Tables
- `deposit_requests` — UNIQUE constraint on `trx_id`

## Security
- `deposit_funds` execute revoked from all roles
- No new tables or policies created
*/

-- ============================================================================
-- 1. PREVENT ADMIN ESCALATION AT SIGNUP
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'worker');

  -- Only 'worker' or 'employer' are allowed from signup metadata.
  -- 'admin' and any other value fall back to 'worker'.
  -- Admin role can only be assigned via a service-role SQL query.
  if v_role not in ('worker', 'employer') then
    v_role := 'worker';
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New user'),
    v_role
  );
  return new;
end;
$$;

-- ============================================================================
-- 2. DISABLE deposit_funds BYPASS — revoke all execute grants
-- ============================================================================

revoke execute on function public.deposit_funds(numeric, text) from public;
revoke execute on function public.deposit_funds(numeric, text) from anon;
revoke execute on function public.deposit_funds(numeric, text) from authenticated;

-- ============================================================================
-- 3. FIX proof_url XSS — validate URL scheme in submit_task_proof
-- ============================================================================

create or replace function public.submit_task_proof(
  p_task_id uuid,
  p_proof_text text,
  p_proof_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_role text;
  v_worker_name text;
  v_submission_id uuid;
begin
  select role, full_name into v_role, v_worker_name from public.profiles where id = auth.uid();
  if v_role is distinct from 'worker' then
    raise exception 'Only workers can submit proof.';
  end if;

  -- Validate proof_url: must be null/empty or start with http:// or https://
  if p_proof_url is not null and p_proof_url <> '' then
    if left(p_proof_url, 7) <> 'http://' and left(p_proof_url, 8) <> 'https://' then
      raise exception 'Proof URL must start with http:// or https://.';
    end if;
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'Task not found.';
  end if;
  if v_task.status <> 'open' or v_task.slots_filled >= v_task.slots_total then
    raise exception 'This task is no longer accepting submissions.';
  end if;

  insert into public.submissions (task_id, worker_id, employer_id, worker_name, proof_text, proof_url)
  values (p_task_id, auth.uid(), v_task.employer_id, v_worker_name, p_proof_text, nullif(p_proof_url, ''))
  returning id into v_submission_id;

  update public.tasks
  set slots_filled = slots_filled + 1,
      status = case when slots_filled + 1 >= slots_total then 'closed' else status end
  where id = p_task_id;

  update public.profiles
  set pending = pending + v_task.reward
  where id = auth.uid();

  return v_submission_id;
exception
  when unique_violation then
    raise exception 'You have already submitted proof for this task.';
end;
$$;

-- Re-grant execute (function was recreated)
grant execute on function public.submit_task_proof(uuid, text, text) to authenticated;
revoke execute on function public.submit_task_proof(uuid, text, text) from public;
revoke execute on function public.submit_task_proof(uuid, text, text) from anon;

-- ============================================================================
-- 4. SECURE request_withdrawal — full validation + role check
-- ============================================================================

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
  v_balance numeric(12,2);
  v_role text;
  v_withdrawal_id uuid;
  v_fee numeric(12,2);
  v_net numeric(12,2);
  v_fee_rate numeric(5,2) := 2.00;
  v_min_amount numeric(12,2) := 2.00;
begin
  -- Must be authenticated (SECURITY DEFINER + grant to authenticated handles this)
  -- but also verify the caller's role is worker
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'worker' then
    raise exception 'Only workers can request withdrawals.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  if p_amount < v_min_amount then
    raise exception 'Minimum withdrawal amount is $2.00.';
  end if;

  if p_method not in ('bkash', 'nagad') then
    raise exception 'Withdrawal method must be bKash or Nagad.';
  end if;

  if p_account_details is null or btrim(p_account_details) = '' then
    raise exception 'Account details are required.';
  end if;

  select earnings into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance is null or v_balance < p_amount then
    raise exception 'You cannot withdraw more than your available earnings.';
  end if;

  v_fee := round((p_amount * v_fee_rate / 100)::numeric, 2);
  v_net := p_amount - v_fee;

  update public.profiles
  set earnings = earnings - p_amount,
      spent = spent + p_amount
  where id = auth.uid();

  insert into public.withdrawals (worker_id, amount, fee_amount, net_amount, method, account_details, status)
  values (auth.uid(), p_amount, v_fee, v_net, p_method, btrim(p_account_details), 'pending')
  returning id into v_withdrawal_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    auth.uid(), 'withdrawal', p_amount, 'pending',
    jsonb_build_object('method', p_method, 'fee', v_fee, 'net', v_net, 'fee_rate', v_fee_rate)
  );

  return v_withdrawal_id;
end;
$$;

-- Re-grant execute (function was recreated)
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
revoke execute on function public.request_withdrawal(numeric, text, text) from public;
revoke execute on function public.request_withdrawal(numeric, text, text) from anon;

-- ============================================================================
-- 5. DUPLICATE DEPOSIT TrxID — unique constraint
-- ============================================================================

-- Remove any existing duplicate trx_id rows before adding the constraint.
-- Keep the oldest row per trx_id, delete newer duplicates.
delete from public.deposit_requests
where id in (
  select id from (
    select id, trx_id,
      row_number() over (partition by trx_id order by created_at) as rn
    from public.deposit_requests
  ) t
  where rn > 1
);

alter table public.deposit_requests
  add constraint deposit_requests_trx_id_unique unique (trx_id);
