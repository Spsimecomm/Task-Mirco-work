/*
# Withdrawal Fee System

## Overview
Adds a 10% withdrawal fee to every withdrawal request. The fee is computed server-side in the `request_withdrawal` function, stored in the `withdrawals` table, and recorded as platform commission in `platform_earnings` when the withdrawal is approved (paid out) by admin.

## Changes
1. `withdrawals` table: add `fee_amount` and `net_amount` columns (nullable for backward compat with existing rows).
2. `request_withdrawal`: compute 10% fee, store fee_amount + net_amount, deduct gross from worker earnings, log the fee in the transaction meta.
3. `admin_approve_withdrawal`: record the fee as platform commission in `platform_earnings` when marking withdrawal as completed.
4. `admin_reject_withdrawal`: refund the gross amount (amount column) to worker earnings, consistent with what was deducted.

## Security
- Fee is computed server-side; client never supplies the fee value.
- All balance changes remain inside SECURITY DEFINER functions.
*/

-- 1. Add fee_amount and net_amount columns to withdrawals
alter table public.withdrawals add column if not exists fee_amount numeric(12,2) default 0;
alter table public.withdrawals add column if not exists net_amount numeric(12,2) default 0;

-- 2. Update request_withdrawal to compute 10% fee server-side
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
  v_withdrawal_id uuid;
  v_fee numeric(12,2);
  v_net numeric(12,2);
  v_fee_rate numeric(5,2) := 10.00;
begin
  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  select earnings into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance < p_amount then
    raise exception 'You cannot withdraw more than your available earnings.';
  end if;

  v_fee := round((p_amount * v_fee_rate / 100)::numeric, 2);
  v_net := p_amount - v_fee;

  update public.profiles
  set earnings = earnings - p_amount,
      spent    = spent + p_amount
  where id = auth.uid();

  insert into public.withdrawals (worker_id, amount, fee_amount, net_amount, method, account_details, status)
  values (auth.uid(), p_amount, v_fee, v_net, p_method, p_account_details, 'pending')
  returning id into v_withdrawal_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    auth.uid(), 'withdrawal', p_amount, 'pending',
    jsonb_build_object('method', p_method, 'fee', v_fee, 'net', v_net)
  );

  return v_withdrawal_id;
end;
$$;

-- 3. Update admin_approve_withdrawal to record fee as platform commission
create or replace function public.admin_approve_withdrawal(p_withdrawal_id uuid)
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
    raise exception 'Only admins can approve withdrawals.';
  end if;

  select * into v_withdrawal from public.withdrawals where id = p_withdrawal_id for update;
  if v_withdrawal.id is null then
    raise exception 'Withdrawal not found.';
  end if;
  if v_withdrawal.status <> 'pending' then
    raise exception 'This withdrawal has already been processed.';
  end if;

  update public.withdrawals
  set status = 'completed'
  where id = p_withdrawal_id;

  -- record the withdrawal fee as platform commission (if a fee was charged)
  if v_withdrawal.fee_amount > 0 then
    insert into public.platform_earnings (submission_id, task_id, worker_id, employer_id, reward_amount, commission_rate, commission_amount)
    values (
      gen_random_uuid()::uuid,  -- no associated submission for withdrawal fees
      gen_random_uuid()::uuid,  -- no associated task for withdrawal fees
      v_withdrawal.worker_id,
      v_withdrawal.worker_id,   -- employer_id = worker_id for withdrawal fee context
      v_withdrawal.amount,
      10.00,
      v_withdrawal.fee_amount
    );
  end if;
end;
$$;

-- 4. Update admin_reject_withdrawal to refund gross amount
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

  -- refund worker earnings (gross amount, matching what was deducted)
  update public.profiles
  set earnings = earnings + v_withdrawal.amount,
      spent   = spent - v_withdrawal.amount
  where id = v_withdrawal.worker_id;
end;
$$;

-- Re-grant execute (function signature unchanged but recreated)
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;
revoke execute on function public.request_withdrawal(numeric, text, text) from anon;
revoke execute on function public.admin_approve_withdrawal(uuid) from anon;
revoke execute on function public.admin_reject_withdrawal(uuid, text) from anon;
