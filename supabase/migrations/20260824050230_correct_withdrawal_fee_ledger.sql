/*
# Correct withdrawal fee ledger

## Overview
Stores withdrawal fees separately from task commissions. Withdrawal fees do not belong to a task or submission, so they must not use placeholder foreign keys.
*/

create table if not exists public.withdrawal_fee_earnings (
  id                uuid primary key default gen_random_uuid(),
  withdrawal_id     uuid not null unique references public.withdrawals(id) on delete cascade,
  worker_id         uuid not null references public.profiles(id) on delete cascade,
  withdrawal_amount numeric(12,2) not null,
  fee_rate          numeric(5,2) not null default 10.00,
  fee_amount        numeric(12,2) not null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_withdrawal_fee_earnings_worker on public.withdrawal_fee_earnings(worker_id);
alter table public.withdrawal_fee_earnings enable row level security;

create policy "withdrawal_fee_earnings_select_admin"
  on public.withdrawal_fee_earnings for select
  to authenticated
  using (public.is_admin());

-- Replace approval to use the dedicated withdrawal fee ledger.
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

  if v_withdrawal.fee_amount > 0 then
    insert into public.withdrawal_fee_earnings (withdrawal_id, worker_id, withdrawal_amount, fee_rate, fee_amount)
    values (v_withdrawal.id, v_withdrawal.worker_id, v_withdrawal.amount, 10.00, v_withdrawal.fee_amount)
    on conflict (withdrawal_id) do nothing;
  end if;
end;
$$;

grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
revoke execute on function public.admin_approve_withdrawal(uuid) from anon;
