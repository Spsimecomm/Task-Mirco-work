-- ============================================================================
-- TASKLY FINAL DATABASE REPAIR / CONSOLIDATION
-- Run this ONCE in Supabase SQL Editor.
-- Non-destructive: does not delete users, balances, tasks, submissions,
-- transactions, referrals, or withdrawal/deposit history.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------------------
-- 1) Ensure core columns/tables used by the current frontend exist.
-- --------------------------------------------------------------------------

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists earnings numeric(12,2) not null default 0,
  add column if not exists pending numeric(12,2) not null default 0,
  add column if not exists spent numeric(12,2) not null default 0,
  add column if not exists deposited numeric(12,2) not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tasks
  add column if not exists max_workers int not null default 1,
  add column if not exists slots_total int not null default 1,
  add column if not exists slots_filled int not null default 0,
  add column if not exists time_limit_minutes int not null default 60,
  add column if not exists updated_at timestamptz not null default now();

alter table public.submissions
  add column if not exists worker_name text,
  add column if not exists proof text,
  add column if not exists proof_text text,
  add column if not exists proof_url text,
  add column if not exists proof_file_url text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.withdrawals
  add column if not exists fee_amount numeric(12,2) not null default 0,
  add column if not exists net_amount numeric(12,2) not null default 0,
  add column if not exists account_number text,
  add column if not exists account_details text,
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.deposit_requests
  add column if not exists employer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists method text,
  add column if not exists payment_method text,
  add column if not exists sender_mobile text,
  add column if not exists sender_number text,
  add column if not exists trx_id text,
  add column if not exists transaction_id text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

update public.deposit_requests
set employer_id = coalesce(employer_id, user_id),
    user_id = coalesce(user_id, employer_id),
    method = coalesce(method, payment_method),
    payment_method = coalesce(payment_method, method),
    sender_mobile = coalesce(sender_mobile, sender_number),
    sender_number = coalesce(sender_number, sender_mobile),
    trx_id = coalesce(trx_id, transaction_id),
    transaction_id = coalesce(transaction_id, trx_id)
where employer_id is null
   or user_id is null
   or method is null
   or payment_method is null
   or sender_mobile is null
   or sender_number is null
   or trx_id is null
   or transaction_id is null;

create table if not exists public.referral_commissions (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'task_approval',
  source_id uuid not null,
  eligible_amount numeric(12,2) not null default 0,
  commission_rate numeric(5,2) not null default 5,
  commission_amount numeric(12,2) not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.platform_earnings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  reward_amount numeric(12,2) not null,
  commission_rate numeric(5,2) not null default 10,
  commission_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawal_fee_earnings (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawals(id) on delete cascade,
  worker_id uuid not null references public.profiles(id) on delete cascade,
  withdrawal_amount numeric(12,2) not null,
  fee_rate numeric(5,2) not null,
  fee_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  label text,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.system_settings
  add column if not exists label text,
  add column if not exists description text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

insert into public.system_settings (key, value, label, description)
values
  ('referral_commission_rate', '5.00', 'Referral Commission Rate (%)', 'Worker referral commission percentage.'),
  ('platform_commission_rate', '10.00', 'Platform Task Commission Rate (%)', 'Platform fee percentage from task reward.'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal Processing Fee (%)', 'Worker withdrawal processing fee percentage.')
on conflict (key) do nothing;

-- --------------------------------------------------------------------------
-- 2) Fix the notification schema mismatch that caused the screenshot error.
--    Old versions used body/target_user_id; current frontend uses
--    message/user_id. Keep old columns if present for backward compatibility.
-- --------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null default '',
  message text not null default '',
  type text not null default 'announcement',
  target_role text not null default 'all',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists message text,
  add column if not exists title text,
  add column if not exists type text,
  add column if not exists target_role text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- Migrate legacy notification fields when they exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notifications' and column_name='body'
  ) then
    execute $q$
      update public.notifications
      set message = coalesce(nullif(message, ''), body, '')
      where message is null or message = ''
    $q$;
  else
    update public.notifications set message = coalesce(message, '') where message is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='notifications' and column_name='target_user_id'
  ) then
    execute $q$
      update public.notifications
      set user_id = coalesce(user_id, target_user_id)
      where user_id is null and target_user_id is not null
    $q$;
  end if;
end $$;

update public.notifications
set message = coalesce(message, ''),
    title = coalesce(title, 'Taskly Notification'),
    type = coalesce(type, 'announcement'),
    target_role = case when target_role in ('all','worker','employer','admin') then target_role else 'all' end
where message is null
   or title is null
   or type is null
   or target_role is null
   or target_role not in ('all','worker','employer','admin');

alter table public.notifications alter column message set default '';
alter table public.notifications alter column message set not null;
alter table public.notifications alter column title set default '';
alter table public.notifications alter column title set not null;
alter table public.notifications alter column type set default 'announcement';
alter table public.notifications alter column type set not null;
alter table public.notifications alter column target_role set default 'all';
alter table public.notifications alter column target_role set not null;

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

-- --------------------------------------------------------------------------
-- 3) Remove the legacy submission trigger.
--    Approval/rejection is now handled exactly once inside the RPCs.
--    Keeping the old trigger would cause double payouts/refunds and used the
--    obsolete notification column names.
-- --------------------------------------------------------------------------

drop trigger if exists trg_submission_status_change on public.submissions;
drop function if exists public.handle_submission_status_change();

-- --------------------------------------------------------------------------
-- 4) Admin helper and secure RLS policies.
-- --------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.submissions enable row level security;
alter table public.referral_commissions enable row level security;
alter table public.platform_earnings enable row level security;
alter table public.withdrawals enable row level security;
alter table public.transactions enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;
alter table public.system_settings enable row level security;
alter table public.withdrawal_fee_earnings enable row level security;

-- Profiles

drop policy if exists profiles_select_policy on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
drop policy if exists profiles_select_referred on public.profiles;
drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_secure on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or referred_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.submissions s
    where s.employer_id = auth.uid() and s.worker_id = profiles.id
  )
);

drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;

-- Tasks

drop policy if exists tasks_select_policy on public.tasks;
drop policy if exists tasks_select_open_or_own on public.tasks;
drop policy if exists tasks_select_open_or_own_or_admin on public.tasks;
create policy tasks_select_secure on public.tasks
for select to authenticated
using (status in ('open','active') or employer_id = auth.uid() or public.is_admin());

drop policy if exists tasks_insert_policy on public.tasks;
drop policy if exists tasks_update_policy on public.tasks;
drop policy if exists tasks_delete_policy on public.tasks;

-- Submissions

drop policy if exists submissions_select_policy on public.submissions;
drop policy if exists submissions_select_own on public.submissions;
drop policy if exists submissions_select_own_or_admin on public.submissions;
create policy submissions_select_secure on public.submissions
for select to authenticated
using (worker_id = auth.uid() or employer_id = auth.uid() or public.is_admin());

drop policy if exists submissions_insert_policy on public.submissions;
drop policy if exists submissions_update_policy on public.submissions;

-- Referral commissions

drop policy if exists commissions_select_policy on public.referral_commissions;
drop policy if exists referral_commissions_select_own_or_admin on public.referral_commissions;
create policy referral_commissions_select_secure on public.referral_commissions
for select to authenticated
using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

-- Platform earnings / withdrawal fees

drop policy if exists platform_earnings_select_admin on public.platform_earnings;
create policy platform_earnings_select_admin on public.platform_earnings
for select to authenticated using (public.is_admin());

drop policy if exists withdrawal_fee_earnings_select_admin on public.withdrawal_fee_earnings;
create policy withdrawal_fee_earnings_select_admin on public.withdrawal_fee_earnings
for select to authenticated using (public.is_admin());

-- Withdrawals

drop policy if exists withdrawals_select_policy on public.withdrawals;
drop policy if exists withdrawals_select_own on public.withdrawals;
drop policy if exists withdrawals_select_own_or_admin on public.withdrawals;
create policy withdrawals_select_secure on public.withdrawals
for select to authenticated using (worker_id = auth.uid() or public.is_admin());
drop policy if exists withdrawals_insert_policy on public.withdrawals;

-- Transactions

drop policy if exists transactions_select_policy on public.transactions;
drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_select_own_or_admin on public.transactions;
create policy transactions_select_secure on public.transactions
for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Deposit requests

drop policy if exists deposits_select_policy on public.deposit_requests;
drop policy if exists deposit_requests_select_own_or_admin on public.deposit_requests;
create policy deposits_select_secure on public.deposit_requests
for select to authenticated using (employer_id = auth.uid() or user_id = auth.uid() or public.is_admin());
drop policy if exists deposits_insert_policy on public.deposit_requests;

-- Notifications

drop policy if exists notifications_select_policy on public.notifications;
drop policy if exists notifications_select_allowed on public.notifications;
create policy notifications_select_secure on public.notifications
for select to authenticated
using (
  user_id = auth.uid()
  or (user_id is null and (target_role = 'all' or target_role = (select p.role from public.profiles p where p.id = auth.uid())))
  or public.is_admin()
);

drop policy if exists notifications_insert_policy on public.notifications;
drop policy if exists notifications_update_policy on public.notifications;
drop policy if exists notifications_delete_policy on public.notifications;

-- Notification reads

drop policy if exists reads_policy on public.notification_reads;
drop policy if exists notification_reads_select_own on public.notification_reads;
drop policy if exists notification_reads_insert_own on public.notification_reads;
create policy notification_reads_select_secure on public.notification_reads
for select to authenticated using (user_id = auth.uid());
create policy notification_reads_insert_secure on public.notification_reads
for insert to authenticated with check (user_id = auth.uid());
create policy notification_reads_update_secure on public.notification_reads
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Settings

drop policy if exists settings_select_policy on public.system_settings;
drop policy if exists system_settings_select_authenticated on public.system_settings;
create policy system_settings_select_secure on public.system_settings
for select to authenticated using (true);

-- --------------------------------------------------------------------------
-- 5) Worker-only referral code + signup handling.
-- --------------------------------------------------------------------------

create or replace function public.generate_unique_referral_code(p_full_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
  v_attempts int := 0;
begin
  v_prefix := upper(substring(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z]', '', 'g') from 1 for 4));
  if length(v_prefix) < 3 then v_prefix := 'WORK'; end if;
  loop
    v_code := v_prefix || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
    if not exists (select 1 from public.profiles where upper(referral_code) = v_code) then
      return v_code;
    end if;
    v_attempts := v_attempts + 1;
    if v_attempts > 30 then
      return 'WRK' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
    end if;
  end loop;
end;
$$;

-- Backfill only workers; employers/admins stay referral-ineligible.
do $$
declare r record;
begin
  for r in select id, full_name from public.profiles where role = 'worker' and (referral_code is null or btrim(referral_code) = '') loop
    update public.profiles
    set referral_code = public.generate_unique_referral_code(r.full_name), updated_at = now()
    where id = r.id;
  end loop;
  update public.profiles set referral_code = null, referred_by = null, updated_at = now()
  where role in ('employer','admin');
end $$;

create unique index if not exists idx_profiles_referral_code_upper
on public.profiles (upper(referral_code)) where referral_code is not null;
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

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
  v_referrer_id uuid;
  v_my_ref_code text;
begin
  v_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', new.raw_app_meta_data->>'role', 'worker')));
  if v_role not in ('worker','employer') then v_role := 'worker'; end if;

  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1), 'New User');
  if btrim(v_full_name) = '' then v_full_name := 'New User'; end if;

  if v_role = 'worker' then
    v_ref_code := upper(btrim(coalesce(new.raw_user_meta_data->>'referral_code', new.raw_user_meta_data->>'ref', '')));
    if v_ref_code <> '' then
      select id into v_referrer_id
      from public.profiles
      where role = 'worker' and upper(referral_code) = v_ref_code and id <> new.id
      limit 1;
    end if;
    v_my_ref_code := public.generate_unique_referral_code(v_full_name);
  else
    v_referrer_id := null;
    v_my_ref_code := null;
  end if;

  insert into public.profiles (id, full_name, role, referral_code, referred_by, earnings, pending, spent, deposited)
  values (new.id, v_full_name, v_role, v_my_ref_code, v_referrer_id, 0, 0, 0, 0)
  on conflict (id) do update
  set full_name = excluded.full_name,
      role = public.profiles.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.generate_unique_referral_code(text) from public;
revoke execute on function public.generate_unique_referral_code(text) from anon;
revoke execute on function public.generate_unique_referral_code(text) from authenticated;

-- --------------------------------------------------------------------------
-- 6) Referral commission engine: worker referrers only, idempotent.
-- --------------------------------------------------------------------------

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
  v_rate numeric(5,2);
  v_commission numeric(12,2);
  v_comm_id uuid;
  v_setting text;
begin
  if p_eligible_amount is null or p_eligible_amount <= 0 then return null; end if;

  select referred_by into v_referrer_id from public.profiles where id = p_referred_id and role = 'worker';
  if v_referrer_id is null or v_referrer_id = p_referred_id then return null; end if;

  select role into v_referrer_role from public.profiles where id = v_referrer_id for update;
  if v_referrer_role is distinct from 'worker' then return null; end if;

  if p_rate is not null and p_rate >= 0 then
    v_rate := p_rate;
  else
    select value into v_setting from public.system_settings where key = 'referral_commission_rate';
    v_rate := coalesce(nullif(v_setting,'')::numeric, 5.00);
  end if;
  v_rate := greatest(0, least(v_rate, 100));
  v_commission := round((p_eligible_amount * v_rate / 100)::numeric, 2);
  if v_commission <= 0 then return null; end if;

  begin
    insert into public.referral_commissions
      (referrer_id, referred_id, source_type, source_id, eligible_amount, commission_rate, commission_amount, status)
    values
      (v_referrer_id, p_referred_id, p_source_type, p_source_id, p_eligible_amount, v_rate, v_commission, 'completed')
    returning id into v_comm_id;
  exception when unique_violation then
    return null;
  end;

  update public.profiles
  set earnings = earnings + v_commission, updated_at = now()
  where id = v_referrer_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (
    v_referrer_id, 'earning', v_commission, 'completed',
    jsonb_build_object('source','referral_commission','referral_commission_id',v_comm_id,'referred_user_id',p_referred_id,'source_type',p_source_type,'source_id',p_source_id,'commission_rate',v_rate)
  );

  insert into public.notifications (user_id, title, message, type, target_role, created_at)
  values (
    v_referrer_id,
    'Referral Bonus Earned! 🎉',
    format('You earned $%s (%s%% commission) from your referred worker.', to_char(v_commission,'FM999,990.00'), v_rate),
    'commission', 'worker', now()
  );

  return v_comm_id;
end;
$$;

revoke execute on function public.process_referral_commission(uuid,text,uuid,numeric,numeric) from public;
revoke execute on function public.process_referral_commission(uuid,text,uuid,numeric,numeric) from anon;
revoke execute on function public.process_referral_commission(uuid,text,uuid,numeric,numeric) from authenticated;

-- --------------------------------------------------------------------------
-- 7) Submit proof RPC.
-- --------------------------------------------------------------------------

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
  v_task public.tasks%rowtype;
  v_role text;
  v_name text;
  v_id uuid;
begin
  select role, full_name into v_role, v_name from public.profiles where id = auth.uid();
  if v_role is distinct from 'worker' then raise exception 'Only workers can submit proof.'; end if;
  if p_proof_text is null or btrim(p_proof_text) = '' then raise exception 'Proof details are required.'; end if;
  if p_proof_url is not null and btrim(p_proof_url) <> '' and left(lower(btrim(p_proof_url)),8) <> 'https://' and left(lower(btrim(p_proof_url)),7) <> 'http://' then
    raise exception 'Proof URL must start with http:// or https://.';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found or v_task.status not in ('open','active') then raise exception 'This task is no longer accepting submissions.'; end if;
  if v_task.employer_id = auth.uid() then raise exception 'You cannot submit work on your own task.'; end if;
  if coalesce(v_task.slots_filled,0) >= coalesce(v_task.slots_total,v_task.max_workers,1) then raise exception 'This task has no remaining slots.'; end if;

  insert into public.submissions (task_id,worker_id,employer_id,worker_name,proof,proof_text,proof_url,proof_file_url,status)
  values (p_task_id,auth.uid(),v_task.employer_id,coalesce(v_name,'Worker'),p_proof_text,p_proof_text,nullif(btrim(p_proof_url),''),nullif(btrim(p_proof_url),''),'pending')
  returning id into v_id;

  update public.tasks
  set slots_filled = slots_filled + 1,
      status = case when slots_filled + 1 >= slots_total then 'closed' else status end,
      updated_at = now()
  where id = p_task_id;

  update public.profiles set pending = pending + v_task.reward, updated_at = now() where id = auth.uid();
  return v_id;
exception when unique_violation then
  raise exception 'You have already submitted proof for this task.';
end;
$$;

grant execute on function public.submit_task_proof(uuid,text,text) to authenticated;
revoke execute on function public.submit_task_proof(uuid,text,text) from public;
revoke execute on function public.submit_task_proof(uuid,text,text) from anon;

-- --------------------------------------------------------------------------
-- 8) APPROVE: one atomic payout path + notification. This fixes the error.
-- --------------------------------------------------------------------------

create or replace function public.approve_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_task public.tasks%rowtype;
  v_caller_role text;
  v_rate numeric(5,2);
  v_setting text;
  v_commission numeric(12,2);
  v_worker_payout numeric(12,2);
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role not in ('employer','admin') then raise exception 'Only the task employer or an admin can approve submissions.'; end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if v_sub.status <> 'pending' then raise exception 'This submission has already been reviewed.'; end if;
  if v_caller_role <> 'admin' and v_sub.employer_id <> auth.uid() then raise exception 'Not authorized to review this submission.'; end if;

  select * into v_task from public.tasks where id = v_sub.task_id for update;
  if not found then raise exception 'Task not found.'; end if;

  select value into v_setting from public.system_settings where key = 'platform_commission_rate';
  v_rate := greatest(0, least(coalesce(nullif(v_setting,'')::numeric,10.00),100));
  v_commission := round((v_task.reward * v_rate / 100)::numeric,2);
  v_worker_payout := greatest(v_task.reward - v_commission,0);

  update public.submissions
  set status='approved', reviewed_at=now(), updated_at=now()
  where id=p_submission_id;

  update public.profiles
  set earnings = earnings + v_worker_payout,
      pending = greatest(pending - v_task.reward, 0),
      updated_at = now()
  where id=v_sub.worker_id;

  update public.profiles
  set pending = greatest(pending - v_task.reward, 0),
      spent = spent + v_task.reward,
      updated_at = now()
  where id=v_sub.employer_id;

  insert into public.platform_earnings (submission_id,task_id,worker_id,employer_id,reward_amount,commission_rate,commission_amount)
  values (p_submission_id,v_sub.task_id,v_sub.worker_id,v_sub.employer_id,v_task.reward,v_rate,v_commission)
  on conflict do nothing;

  insert into public.transactions (user_id,type,amount,status,meta)
  values
    (v_sub.worker_id,'earning',v_worker_payout,'completed',jsonb_build_object('submission_id',p_submission_id,'task_id',v_sub.task_id,'commission',v_commission)),
    (v_sub.employer_id,'spend',v_task.reward,'completed',jsonb_build_object('submission_id',p_submission_id,'task_id',v_sub.task_id));

  perform public.process_referral_commission(v_sub.worker_id,'task_approval',p_submission_id,v_task.reward,null);

  insert into public.notifications (user_id,title,message,type,target_role,created_at)
  values (
    v_sub.worker_id,
    'Task Approved! 💰',
    format('Your submission for "%s" was approved. $%s has been added to your earnings.',v_task.title,to_char(v_worker_payout,'FM999,990.00')),
    'reward','worker',now()
  );
end;
$$;

grant execute on function public.approve_submission(uuid) to authenticated;
revoke execute on function public.approve_submission(uuid) from public;
revoke execute on function public.approve_submission(uuid) from anon;

-- --------------------------------------------------------------------------
-- 9) REJECT: refund employer escrow and worker pending exactly once.
-- --------------------------------------------------------------------------

create or replace function public.reject_submission(p_submission_id uuid, p_reason text default 'Rejected by employer')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_task public.tasks%rowtype;
  v_role text;
  v_reason text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('employer','admin') then raise exception 'Only the task employer or an admin can reject submissions.'; end if;

  select * into v_sub from public.submissions where id=p_submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if v_sub.status <> 'pending' then raise exception 'This submission has already been reviewed.'; end if;
  if v_role <> 'admin' and v_sub.employer_id <> auth.uid() then raise exception 'Not authorized to review this submission.'; end if;

  select * into v_task from public.tasks where id=v_sub.task_id for update;
  if not found then raise exception 'Task not found.'; end if;
  v_reason := coalesce(nullif(btrim(p_reason),''),'Rejected by employer');

  update public.submissions
  set status='rejected', rejection_reason=v_reason, reviewed_at=now(), updated_at=now()
  where id=p_submission_id;

  update public.profiles
  set pending=greatest(pending-v_task.reward,0), updated_at=now()
  where id=v_sub.worker_id;

  update public.profiles
  set pending=greatest(pending-v_task.reward,0),
      deposited=deposited+v_task.reward,
      spent=greatest(spent-v_task.reward,0),
      updated_at=now()
  where id=v_sub.employer_id;

  update public.tasks
  set slots_filled=greatest(slots_filled-1,0), status='open', updated_at=now()
  where id=v_sub.task_id;

  insert into public.transactions (user_id,type,amount,status,meta)
  values (
    v_sub.employer_id,'escrow_refund',v_task.reward,'completed',
    jsonb_build_object('submission_id',p_submission_id,'task_id',v_sub.task_id,'reason',v_reason)
  );

  insert into public.notifications (user_id,title,message,type,target_role,created_at)
  values (
    v_sub.worker_id,
    'Submission Rejected',
    format('Your submission for "%s" was rejected: %s',coalesce(v_task.title,'Task'),v_reason),
    'alert','worker',now()
  );
end;
$$;

grant execute on function public.reject_submission(uuid,text) to authenticated;
revoke execute on function public.reject_submission(uuid,text) from public;
revoke execute on function public.reject_submission(uuid,text) from anon;

create or replace function public.approve_submission_and_pay(p_submission_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin perform public.approve_submission(p_submission_id); end; $$;
grant execute on function public.approve_submission_and_pay(uuid) to authenticated;

create or replace function public.reject_submission_and_refund(p_submission_id uuid, p_reason text default 'Rejected by employer')
returns void language plpgsql security definer set search_path=public as $$
begin perform public.reject_submission(p_submission_id,p_reason); end; $$;
grant execute on function public.reject_submission_and_refund(uuid,text) to authenticated;

-- --------------------------------------------------------------------------
-- 10) Deposit / admin / withdrawal RPCs used by the frontend.
-- --------------------------------------------------------------------------

create or replace function public.request_deposit(p_amount numeric,p_method text,p_sender_mobile text,p_trx_id text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_role text; v_id uuid;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'employer' then raise exception 'Only employers can request deposits.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Deposit amount must be greater than zero.'; end if;
  if lower(trim(p_method)) not in ('bkash','nagad') then raise exception 'Payment method must be bKash or Nagad.'; end if;
  if btrim(coalesce(p_sender_mobile,''))='' then raise exception 'Sender mobile number is required.'; end if;
  if btrim(coalesce(p_trx_id,''))='' then raise exception 'Transaction ID is required.'; end if;
  if exists(select 1 from public.deposit_requests where lower(coalesce(trx_id,transaction_id,''))=lower(btrim(p_trx_id))) then raise exception 'This transaction ID has already been submitted.'; end if;

  insert into public.deposit_requests (employer_id,user_id,amount,method,payment_method,sender_mobile,sender_number,trx_id,transaction_id,status)
  values (auth.uid(),auth.uid(),p_amount,lower(trim(p_method)),lower(trim(p_method)),btrim(p_sender_mobile),btrim(p_sender_mobile),btrim(p_trx_id),btrim(p_trx_id),'pending')
  returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.request_deposit(numeric,text,text,text) to authenticated;
revoke execute on function public.request_deposit(numeric,text,text,text) from public;
revoke execute on function public.request_deposit(numeric,text,text,text) from anon;

create or replace function public.admin_approve_deposit(p_deposit_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare v_dep public.deposit_requests%rowtype; v_role text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'admin' then raise exception 'Only admins can approve deposits.'; end if;
  select * into v_dep from public.deposit_requests where id=p_deposit_id for update;
  if not found then raise exception 'Deposit request not found.'; end if;
  if v_dep.status <> 'pending' then raise exception 'This deposit has already been reviewed.'; end if;
  update public.deposit_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where id=p_deposit_id;
  update public.profiles set deposited=deposited+v_dep.amount,updated_at=now() where id=coalesce(v_dep.employer_id,v_dep.user_id);
  insert into public.transactions(user_id,type,amount,status,meta)
  values(coalesce(v_dep.employer_id,v_dep.user_id),'deposit',v_dep.amount,'completed',jsonb_build_object('deposit_request_id',p_deposit_id,'method',coalesce(v_dep.method,v_dep.payment_method),'trx_id',coalesce(v_dep.trx_id,v_dep.transaction_id)));
  perform public.process_referral_commission(coalesce(v_dep.employer_id,v_dep.user_id),'deposit',p_deposit_id,v_dep.amount,null);
  insert into public.notifications(user_id,title,message,type,target_role,created_at)
  values(coalesce(v_dep.employer_id,v_dep.user_id),'Deposit Approved','Your deposit of $'||to_char(v_dep.amount,'FM999,990.00')||' has been approved.','reward','employer',now());
end; $$;

grant execute on function public.admin_approve_deposit(uuid) to authenticated;
revoke execute on function public.admin_approve_deposit(uuid) from public;
revoke execute on function public.admin_approve_deposit(uuid) from anon;

create or replace function public.admin_reject_deposit(p_deposit_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public
as $$
declare v_role text; v_dep public.deposit_requests%rowtype; v_reason text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'admin' then raise exception 'Only admins can reject deposits.'; end if;
  select * into v_dep from public.deposit_requests where id=p_deposit_id for update;
  if not found or v_dep.status<>'pending' then raise exception 'Deposit request not found or already reviewed.'; end if;
  v_reason:=coalesce(nullif(btrim(p_reason),''),'Rejected by admin');
  update public.deposit_requests set status='rejected',rejection_reason=v_reason,reviewed_at=now(),reviewed_by=auth.uid() where id=p_deposit_id;
  insert into public.notifications(user_id,title,message,type,target_role,created_at)
  values(coalesce(v_dep.employer_id,v_dep.user_id),'Deposit Rejected',v_reason,'alert','employer',now());
end; $$;

grant execute on function public.admin_reject_deposit(uuid,text) to authenticated;
revoke execute on function public.admin_reject_deposit(uuid,text) from public;
revoke execute on function public.admin_reject_deposit(uuid,text) from anon;

create or replace function public.request_withdrawal(p_amount numeric,p_method text,p_account_details text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_role text; v_balance numeric(12,2); v_fee_rate numeric(5,2); v_fee numeric(12,2); v_net numeric(12,2); v_id uuid; v_setting text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'worker' then raise exception 'Only workers can request withdrawals.'; end if;
  if p_amount is null or p_amount < 2 then raise exception 'Minimum withdrawal amount is $2.00.'; end if;
  if lower(trim(p_method)) not in ('bkash','nagad') then raise exception 'Withdrawal method must be bKash or Nagad.'; end if;
  if btrim(coalesce(p_account_details,''))='' then raise exception 'Account details are required.'; end if;
  select earnings into v_balance from public.profiles where id=auth.uid() for update;
  if coalesce(v_balance,0)<p_amount then raise exception 'You cannot withdraw more than your available earnings.'; end if;
  select value into v_setting from public.system_settings where key='withdrawal_fee_rate';
  v_fee_rate:=greatest(0,least(coalesce(nullif(v_setting,'')::numeric,2),100));
  v_fee:=round((p_amount*v_fee_rate/100)::numeric,2); v_net:=p_amount-v_fee;
  update public.profiles set earnings=earnings-p_amount,spent=spent+p_amount,updated_at=now() where id=auth.uid();
  insert into public.withdrawals(worker_id,amount,fee_amount,net_amount,method,account_number,account_details,status)
  values(auth.uid(),p_amount,v_fee,v_net,lower(trim(p_method)),btrim(p_account_details),btrim(p_account_details),'pending') returning id into v_id;
  insert into public.transactions(user_id,type,amount,status,meta)
  values(auth.uid(),'withdrawal',p_amount,'pending',jsonb_build_object('withdrawal_id',v_id,'method',p_method,'fee_rate',v_fee_rate,'fee_amount',v_fee,'net_amount',v_net));
  return v_id;
end; $$;

grant execute on function public.request_withdrawal(numeric,text,text) to authenticated;
revoke execute on function public.request_withdrawal(numeric,text,text) from public;
revoke execute on function public.request_withdrawal(numeric,text,text) from anon;

create or replace function public.admin_approve_withdrawal(p_withdrawal_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare v_role text; v_w public.withdrawals%rowtype; v_rate numeric; v_setting text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'admin' then raise exception 'Only admins can approve withdrawals.'; end if;
  select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
  if not found or v_w.status<>'pending' then raise exception 'Withdrawal not found or already processed.'; end if;
  update public.withdrawals set status='completed',updated_at=now() where id=p_withdrawal_id;
  select value into v_setting from public.system_settings where key='withdrawal_fee_rate';
  v_rate:=coalesce(nullif(v_setting,'')::numeric,2);
  if coalesce(v_w.fee_amount,0)>0 then
    insert into public.withdrawal_fee_earnings(withdrawal_id,worker_id,withdrawal_amount,fee_rate,fee_amount)
    values(v_w.id,v_w.worker_id,v_w.amount,v_rate,v_w.fee_amount)
    on conflict(withdrawal_id) do nothing;
  end if;
  insert into public.notifications(user_id,title,message,type,target_role,created_at)
  values(v_w.worker_id,'Withdrawal Approved','Your withdrawal of $'||to_char(v_w.net_amount,'FM999,990.00')||' has been approved and marked as paid.','reward','worker',now());
end; $$;

grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;
revoke execute on function public.admin_approve_withdrawal(uuid) from public;
revoke execute on function public.admin_approve_withdrawal(uuid) from anon;

create or replace function public.admin_reject_withdrawal(p_withdrawal_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public
as $$
declare v_role text; v_w public.withdrawals%rowtype; v_reason text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role is distinct from 'admin' then raise exception 'Only admins can reject withdrawals.'; end if;
  select * into v_w from public.withdrawals where id=p_withdrawal_id for update;
  if not found or v_w.status<>'pending' then raise exception 'Withdrawal not found or already processed.'; end if;
  v_reason:=coalesce(nullif(btrim(p_reason),''),'Rejected by admin');
  update public.withdrawals set status='rejected',rejection_reason=v_reason,updated_at=now() where id=p_withdrawal_id;
  update public.profiles set earnings=earnings+v_w.amount,spent=greatest(spent-v_w.amount,0),updated_at=now() where id=v_w.worker_id;
  insert into public.transactions(user_id,type,amount,status,meta)
  values(v_w.worker_id,'admin_adjustment',v_w.amount,'completed',jsonb_build_object('withdrawal_id',v_w.id,'reason',v_reason,'action','withdrawal_refund'));
  insert into public.notifications(user_id,title,message,type,target_role,created_at)
  values(v_w.worker_id,'Withdrawal Rejected',v_reason,'alert','worker',now());
end; $$;

grant execute on function public.admin_reject_withdrawal(uuid,text) to authenticated;
revoke execute on function public.admin_reject_withdrawal(uuid,text) from public;
revoke execute on function public.admin_reject_withdrawal(uuid,text) from anon;

-- --------------------------------------------------------------------------
-- 11) Admin notification/settings RPCs.
-- --------------------------------------------------------------------------

create or replace function public.admin_send_notification(p_title text,p_message text,p_type text default 'announcement',p_target_role text default 'all',p_user_id uuid default null)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Only administrators can send notifications.'; end if;
  if btrim(coalesce(p_title,''))='' or btrim(coalesce(p_message,''))='' then raise exception 'Notification title and message cannot be empty.'; end if;
  if coalesce(p_target_role,'all') not in ('all','worker','employer','admin') then raise exception 'Invalid notification target role.'; end if;
  insert into public.notifications(user_id,title,message,type,target_role,created_by,created_at)
  values(p_user_id,btrim(p_title),btrim(p_message),coalesce(nullif(btrim(p_type),''),'announcement'),coalesce(p_target_role,'all'),auth.uid(),now())
  returning id into v_id;
  return v_id;
end; $$;

grant execute on function public.admin_send_notification(text,text,text,text,uuid) to authenticated;
revoke execute on function public.admin_send_notification(text,text,text,text,uuid) from public;
revoke execute on function public.admin_send_notification(text,text,text,text,uuid) from anon;

create or replace function public.admin_delete_notification(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Only administrators can delete notifications.'; end if;
  delete from public.notifications where id=p_notification_id;
end; $$;
grant execute on function public.admin_delete_notification(uuid) to authenticated;
revoke execute on function public.admin_delete_notification(uuid) from public;
revoke execute on function public.admin_delete_notification(uuid) from anon;

create or replace function public.mark_notification_as_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not exists (
    select 1 from public.notifications n
    where n.id=p_notification_id and (n.user_id=auth.uid() or (n.user_id is null and (n.target_role='all' or n.target_role=(select role from public.profiles where id=auth.uid()))))
  ) then raise exception 'Notification not available to this user.'; end if;
  insert into public.notification_reads(notification_id,user_id,read_at)
  values(p_notification_id,auth.uid(),now())
  on conflict(notification_id,user_id) do update set read_at=excluded.read_at;
end; $$;
grant execute on function public.mark_notification_as_read(uuid) to authenticated;
revoke execute on function public.mark_notification_as_read(uuid) from public;
revoke execute on function public.mark_notification_as_read(uuid) from anon;

create or replace function public.mark_all_notifications_as_read()
returns void language plpgsql security definer set search_path=public
as $$
declare v_role text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  insert into public.notification_reads(notification_id,user_id,read_at)
  select n.id,auth.uid(),now()
  from public.notifications n
  where n.user_id=auth.uid() or (n.user_id is null and (n.target_role='all' or n.target_role=v_role))
  on conflict(notification_id,user_id) do update set read_at=excluded.read_at;
end; $$;
grant execute on function public.mark_all_notifications_as_read() to authenticated;
revoke execute on function public.mark_all_notifications_as_read() from public;
revoke execute on function public.mark_all_notifications_as_read() from anon;

create or replace function public.admin_update_system_setting(p_key text,p_value text)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then raise exception 'Only administrators can update system settings.'; end if;
  if btrim(coalesce(p_key,''))='' or btrim(coalesce(p_value,''))='' then raise exception 'Setting key and value cannot be empty.'; end if;
  if p_key in ('referral_commission_rate','platform_commission_rate','withdrawal_fee_rate') then
    if p_value::numeric < 0 or p_value::numeric > 100 then raise exception 'Rate must be between 0 and 100.'; end if;
  end if;
  insert into public.system_settings(key,value,label,updated_at,updated_by)
  values(p_key,btrim(p_value),p_key,now(),auth.uid())
  on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=auth.uid();
end; $$;
grant execute on function public.admin_update_system_setting(text,text) to authenticated;
revoke execute on function public.admin_update_system_setting(text,text) from public;
revoke execute on function public.admin_update_system_setting(text,text) from anon;

-- --------------------------------------------------------------------------
-- 12) Final grants/revokes and realtime.
-- --------------------------------------------------------------------------

grant usage on schema public to authenticated;

-- Do not allow direct client writes to financial tables; all balance changes go
-- through SECURITY DEFINER RPCs above.
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.tasks from authenticated;
revoke insert, update, delete on public.submissions from authenticated;
revoke insert, update, delete on public.referral_commissions from authenticated;
revoke insert, update, delete on public.platform_earnings from authenticated;
revoke insert, update, delete on public.withdrawals from authenticated;
revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.deposit_requests from authenticated;
revoke insert, update, delete on public.notifications from authenticated;
revoke update, delete on public.notification_reads from authenticated;
revoke insert, update, delete on public.system_settings from authenticated;
revoke insert, update, delete on public.withdrawal_fee_earnings from authenticated;

do $$
begin
  begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.notification_reads; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.referral_commissions; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.submissions; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- ============================================================================
-- END
-- ============================================================================
