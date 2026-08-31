/*
# Notifications & Dynamic System Settings Upgrade

## Overview
1. `system_settings` table:
   - Stores configurable platform settings (referral commission rate, platform task commission rate, withdrawal fee rate).
   - Allows administrators to dynamically adjust rates from the Admin Control Center without touching code or running manual SQL.
   - Functions `process_referral_commission`, `approve_submission`, and `request_withdrawal` read dynamically from `system_settings`.

2. `notifications` & `notification_reads` tables:
   - Global broadcasts (user_id IS NULL) and targeted user notifications.
   - Role-scoped filtering (all, worker, employer, admin).
   - Read receipt tracking per user in `notification_reads`.
   - Real-time updates via Supabase Realtime channel.
   - Admin RPC `admin_send_notification` and user RPCs for marking notifications as read.
*/

-- ----------------------------------------------------------------------------
-- 1. System Settings Table
-- ----------------------------------------------------------------------------
create table if not exists public.system_settings (
  key         text primary key,
  value       text not null,
  label       text not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

-- Seed initial settings if not present
insert into public.system_settings (key, value, label, description)
values
  ('referral_commission_rate', '5.00', 'Referral Commission Rate (%)', 'Percentage of task earnings or deposits awarded to the referrer.'),
  ('platform_commission_rate', '10.00', 'Platform Task Commission Rate (%)', 'Percentage deducted as platform fee from worker reward upon task approval.'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal Processing Fee (%)', 'Fee percentage deducted on worker cashout requests.')
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

-- All authenticated users can read public settings
drop policy if exists "system_settings_select_authenticated" on public.system_settings;
create policy "system_settings_select_authenticated"
  on public.system_settings for select
  to authenticated
  using (true);

-- Admin update setting RPC
create or replace function public.admin_update_system_setting(p_key text, p_value text)
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
    raise exception 'Only administrators can update system settings.';
  end if;

  if trim(p_key) = '' or trim(p_value) = '' then
    raise exception 'Setting key and value cannot be empty.';
  end if;

  insert into public.system_settings (key, value, label, updated_at, updated_by)
  values (p_key, p_value, p_key, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant execute on function public.admin_update_system_setting(text, text) to authenticated;
revoke execute on function public.admin_update_system_setting(text, text) from anon;
revoke execute on function public.admin_update_system_setting(text, text) from public;

-- ----------------------------------------------------------------------------
-- 2. Notifications & Notification Reads Tables
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade, -- NULL means global announcement
  title       text not null,
  message     text not null,
  type        text not null default 'announcement' check (type in ('announcement', 'system', 'commission', 'reward', 'alert')),
  target_role text not null default 'all' check (target_role in ('all', 'worker', 'employer', 'admin')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists idx_notification_reads_user on public.notification_reads(user_id);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Notifications Select Policy
drop policy if exists "notifications_select_allowed" on public.notifications;
create policy "notifications_select_allowed"
  on public.notifications for select
  to authenticated
  using (
    -- Direct to user
    user_id = auth.uid()
    -- Or global/role targeted
    or (
      user_id is null
      and (
        target_role = 'all'
        or target_role = (select role from public.profiles where id = auth.uid())
      )
    )
    -- Or caller is admin
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Notification Reads Policies
drop policy if exists "notification_reads_select_own" on public.notification_reads;
create policy "notification_reads_select_own"
  on public.notification_reads for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notification_reads_insert_own" on public.notification_reads;
create policy "notification_reads_insert_own"
  on public.notification_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. RPC: admin_send_notification
-- ----------------------------------------------------------------------------
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
    raise exception 'Only administrators can send notifications.';
  end if;

  if trim(coalesce(p_title, '')) = '' or trim(coalesce(p_message, '')) = '' then
    raise exception 'Notification title and message cannot be empty.';
  end if;

  insert into public.notifications (
    title,
    message,
    type,
    target_role,
    user_id,
    created_by,
    created_at
  )
  values (
    trim(p_title),
    trim(p_message),
    coalesce(p_type, 'announcement'),
    coalesce(p_target_role, 'all'),
    p_user_id,
    auth.uid(),
    now()
  )
  returning id into v_notif_id;

  return v_notif_id;
end;
$$;

grant execute on function public.admin_send_notification(text, text, text, text, uuid) to authenticated;
revoke execute on function public.admin_send_notification(text, text, text, text, uuid) from anon;
revoke execute on function public.admin_send_notification(text, text, text, text, uuid) from public;

-- RPC: admin_delete_notification
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
    raise exception 'Only administrators can delete notifications.';
  end if;

  delete from public.notifications where id = p_notification_id;
end;
$$;

grant execute on function public.admin_delete_notification(uuid) to authenticated;
revoke execute on function public.admin_delete_notification(uuid) from anon;
revoke execute on function public.admin_delete_notification(uuid) from public;

-- RPC: mark_notification_as_read
create or replace function public.mark_notification_as_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_reads (notification_id, user_id, read_at)
  values (p_notification_id, auth.uid(), now())
  on conflict (notification_id, user_id) do update
    set read_at = now();
end;
$$;

grant execute on function public.mark_notification_as_read(uuid) to authenticated;
revoke execute on function public.mark_notification_as_read(uuid) from anon;
revoke execute on function public.mark_notification_as_read(uuid) from public;

-- RPC: mark_all_notifications_as_read
create or replace function public.mark_all_notifications_as_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_my_role text;
begin
  select role into v_my_role from public.profiles where id = auth.uid();

  insert into public.notification_reads (notification_id, user_id, read_at)
  select n.id, auth.uid(), now()
  from public.notifications n
  where (
    n.user_id = auth.uid()
    or (
      n.user_id is null
      and (n.target_role = 'all' or n.target_role = v_my_role)
    )
  )
  on conflict (notification_id, user_id) do nothing;
end;
$$;

grant execute on function public.mark_all_notifications_as_read() to authenticated;
revoke execute on function public.mark_all_notifications_as_read() from anon;
revoke execute on function public.mark_all_notifications_as_read() from public;

-- ----------------------------------------------------------------------------
-- 4. Dynamic Rates Integration in process_referral_commission
-- ----------------------------------------------------------------------------
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
  v_commission_amount numeric(12,2);
  v_comm_id uuid;
  v_effective_rate numeric(5,2);
  v_setting_val text;
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

  -- 2. Determine commission rate dynamically from system_settings if not passed
  if p_rate is not null and p_rate > 0 then
    v_effective_rate := p_rate;
  else
    select value into v_setting_val
    from public.system_settings
    where key = 'referral_commission_rate';

    v_effective_rate := coalesce(nullif(v_setting_val, '')::numeric, 5.00);
  end if;

  -- 3. Lock referrer profile row for update to ensure atomic balance update
  select role into v_referrer_role
  from public.profiles
  where id = v_referrer_id
  for update;

  if v_referrer_role is null then
    return null; -- Referrer no longer exists
  end if;

  -- 4. Calculate commission amount (rounded to 2 decimal places)
  v_commission_amount := round((p_eligible_amount * v_effective_rate / 100)::numeric, 2);
  if v_commission_amount <= 0 then
    return null;
  end if;

  -- 5. Insert into referral_commissions (idempotent due to unique constraint)
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
      v_effective_rate,
      v_commission_amount,
      'completed'
    )
    returning id into v_comm_id;
  exception
    when unique_violation then
      -- Already processed for this source_id; prevent duplicate payout
      return null;
  end;

  -- 6. Credit referrer's existing balance based on role:
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

  -- 7. Record financial transaction entry
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
      'commission_rate', v_effective_rate
    )
  );

  return v_comm_id;
end;
$$;

revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from public;
revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from anon;
revoke execute on function public.process_referral_commission(uuid, text, uuid, numeric, numeric) from authenticated;

-- ----------------------------------------------------------------------------
-- 5. Dynamic Rates Integration in approve_submission
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
  v_commission_rate numeric(5,2);
  v_setting_val text;
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

  -- Read dynamic platform commission rate from system_settings
  select value into v_setting_val
  from public.system_settings
  where key = 'platform_commission_rate';

  v_commission_rate := coalesce(nullif(v_setting_val, '')::numeric, 10.00);

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

  -- 🎁 Process Referral Commission (rate dynamically retrieved inside process_referral_commission)
  perform public.process_referral_commission(
    v_sub.worker_id,
    'task_approval',
    p_submission_id,
    v_reward
  );
end;
$$;

grant execute on function public.approve_submission(uuid) to authenticated;
revoke execute on function public.approve_submission(uuid) from anon;
revoke execute on function public.approve_submission(uuid) from public;

-- ----------------------------------------------------------------------------
-- 6. Dynamic Rates Integration in admin_approve_deposit
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

  -- 🎁 Process Referral Commission on deposit
  perform public.process_referral_commission(
    v_deposit.employer_id,
    'deposit',
    p_deposit_id,
    v_deposit.amount
  );
end;
$$;

grant execute on function public.admin_approve_deposit(uuid) to authenticated;
revoke execute on function public.admin_approve_deposit(uuid) from anon;
revoke execute on function public.admin_approve_deposit(uuid) from public;

-- ----------------------------------------------------------------------------
-- 7. Dynamic Rates Integration in request_withdrawal
-- ----------------------------------------------------------------------------
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
  v_fee_rate numeric(5,2);
  v_setting_val text;
begin
  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  select earnings into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance < p_amount then
    raise exception 'You cannot withdraw more than your available earnings.';
  end if;

  -- Read dynamic withdrawal fee rate from system_settings
  select value into v_setting_val
  from public.system_settings
  where key = 'withdrawal_fee_rate';

  v_fee_rate := coalesce(nullif(v_setting_val, '')::numeric, 2.00);

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
    auth.uid(),
    'withdrawal',
    p_amount,
    'pending',
    jsonb_build_object('method', p_method, 'fee_rate', v_fee_rate, 'fee_amount', v_fee, 'net_amount', v_net)
  );

  return v_withdrawal_id;
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
revoke execute on function public.request_withdrawal(numeric, text, text) from anon;
revoke execute on function public.request_withdrawal(numeric, text, text) from public;

-- ----------------------------------------------------------------------------
-- 8. Add tables to Realtime publication
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.notification_reads;
alter publication supabase_realtime add table public.system_settings;
