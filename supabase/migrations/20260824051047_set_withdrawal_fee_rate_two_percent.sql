/*
# Set withdrawal fee to 2 percent

The client displays a 2% fee, so the server must calculate and store the same rate. The fee remains server-derived and cannot be supplied by the browser.
*/

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
  v_fee_rate numeric(5,2) := 2.00;
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
      spent = spent + p_amount
  where id = auth.uid();

  insert into public.withdrawals (worker_id, amount, fee_amount, net_amount, method, account_details, status)
  values (auth.uid(), p_amount, v_fee, v_net, p_method, p_account_details, 'pending')
  returning id into v_withdrawal_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    auth.uid(), 'withdrawal', p_amount, 'pending',
    jsonb_build_object('method', p_method, 'fee', v_fee, 'net', v_net, 'fee_rate', v_fee_rate)
  );

  return v_withdrawal_id;
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

  update public.withdrawals set status = 'completed' where id = p_withdrawal_id;

  if v_withdrawal.fee_amount > 0 then
    insert into public.withdrawal_fee_earnings (withdrawal_id, worker_id, withdrawal_amount, fee_rate, fee_amount)
    values (v_withdrawal.id, v_withdrawal.worker_id, v_withdrawal.amount, 2.00, v_withdrawal.fee_amount)
    on conflict (withdrawal_id) do nothing;
  end if;
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
revoke execute on function public.request_withdrawal(numeric, text, text) from public;
revoke execute on function public.admin_approve_withdrawal(uuid) from public;
