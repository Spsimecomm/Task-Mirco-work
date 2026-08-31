-- ============================================================================
-- Taskly — Micro-Task Platform
-- Full Supabase schema: tables, Row Level Security, and RPC functions.
--
-- HOW TO USE
-- 1. Create a project at https://supabase.com
-- 2. Open the SQL editor and run this entire file once.
-- 3. Copy your Project URL + anon public key into .env (see .env.example).
--
-- SECURITY MODEL
-- Wallet balances (earnings/pending/spent/deposited) are NEVER updated
-- directly by client UPDATE statements — there is no UPDATE policy granted
-- to authenticated users on `profiles`. Every balance change happens inside
-- a SECURITY DEFINER function below, so money can only move through logic
-- we control (task funding, approval, rejection, deposits, withdrawals).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('worker', 'employer')),
  earnings    numeric(12,2) not null default 0,  -- worker: approved & available
  pending     numeric(12,2) not null default 0,  -- worker: awaiting review / employer: reserved for open submissions
  spent       numeric(12,2) not null default 0,  -- worker: total withdrawn / employer: total paid to workers
  deposited   numeric(12,2) not null default 0,  -- employer: available balance to fund tasks
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  employer_id         uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  category            text not null check (category in ('Social Media', 'Sign Up', 'Video Watching', 'Data Entry')),
  description         text not null,
  proof_instructions  text not null,
  reward              numeric(12,2) not null check (reward > 0),
  slots_total         int not null check (slots_total > 0),
  slots_filled        int not null default 0,
  status              text not null default 'open' check (status in ('open', 'closed')),
  created_at          timestamptz not null default now()
);

create table if not exists public.submissions (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references public.tasks(id) on delete cascade,
  worker_id         uuid not null references public.profiles(id) on delete cascade,
  employer_id       uuid not null references public.profiles(id) on delete cascade,
  worker_name       text not null,
  proof_text        text not null,
  proof_url         text,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz,
  unique (task_id, worker_id)
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('deposit', 'withdrawal', 'earning', 'spend')),
  amount      numeric(12,2) not null,
  status      text not null default 'completed' check (status in ('pending', 'completed')),
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id                uuid primary key default gen_random_uuid(),
  worker_id         uuid not null references public.profiles(id) on delete cascade,
  amount            numeric(12,2) not null,
  method            text not null,
  account_details   text not null,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at        timestamptz not null default now()
);

create index if not exists idx_tasks_employer on public.tasks(employer_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_submissions_worker on public.submissions(worker_id);
create index if not exists idx_submissions_employer on public.submissions(employer_id);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_withdrawals_worker on public.withdrawals(worker_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.tasks        enable row level security;
alter table public.submissions  enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawals  enable row level security;

-- profiles: a user can only ever read their own wallet/profile row.
-- No UPDATE/INSERT policy is granted — all writes happen via SECURITY
-- DEFINER functions below.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- tasks: everyone can browse open tasks; employers can also see their own
-- tasks regardless of status. Inserts only happen via create_task_with_funding.
create policy "tasks_select_open_or_own"
  on public.tasks for select
  using (status = 'open' or employer_id = auth.uid());

-- submissions: visible only to the worker who submitted it or the employer
-- who owns the task. Inserts/updates only via RPC functions.
create policy "submissions_select_own"
  on public.submissions for select
  using (worker_id = auth.uid() or employer_id = auth.uid());

-- transactions: users can only see their own ledger entries.
create policy "transactions_select_own"
  on public.transactions for select
  using (user_id = auth.uid());

-- withdrawals: workers can only see their own withdrawal requests.
create policy "withdrawals_select_own"
  on public.withdrawals for select
  using (worker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- NEW USER TRIGGER — creates a profile row when someone signs up
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New user'),
    coalesce(new.raw_user_meta_data->>'role', 'worker')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RPC: deposit_funds — employer adds money to their spendable balance
-- ----------------------------------------------------------------------------

create or replace function public.deposit_funds(p_amount numeric, p_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero.';
  end if;

  update public.profiles
  set deposited = deposited + p_amount
  where id = auth.uid();

  insert into public.transactions (user_id, type, amount, status, meta)
  values (auth.uid(), 'deposit', p_amount, 'completed', jsonb_build_object('method', p_method));
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: create_task_with_funding — employer posts a task; budget is reserved
-- from their deposited balance up front (reward * slots).
-- ----------------------------------------------------------------------------

create or replace function public.create_task_with_funding(
  p_title text,
  p_category text,
  p_description text,
  p_proof_instructions text,
  p_reward numeric,
  p_slots int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget numeric(12,2);
  v_task_id uuid;
  v_role text;
  v_balance numeric(12,2);
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'employer' then
    raise exception 'Only employers can post tasks.';
  end if;

  if p_reward <= 0 or p_slots <= 0 then
    raise exception 'Reward and slots must be greater than zero.';
  end if;

  v_budget := p_reward * p_slots;

  select deposited into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance < v_budget then
    raise exception 'Insufficient balance. Deposit more funds to cover this task budget.';
  end if;

  update public.profiles
  set deposited = deposited - v_budget,
      pending   = pending + v_budget
  where id = auth.uid();

  insert into public.tasks (employer_id, title, category, description, proof_instructions, reward, slots_total)
  values (auth.uid(), p_title, p_category, p_description, p_proof_instructions, p_reward, p_slots)
  returning id into v_task_id;

  return v_task_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: submit_task_proof — worker submits proof of completed work
-- ----------------------------------------------------------------------------

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

  select * into v_task from public.tasks where id = p_task_id for update;
  if v_task.id is null then
    raise exception 'Task not found.';
  end if;
  if v_task.status <> 'open' or v_task.slots_filled >= v_task.slots_total then
    raise exception 'This task is no longer accepting submissions.';
  end if;

  insert into public.submissions (task_id, worker_id, employer_id, worker_name, proof_text, proof_url)
  values (p_task_id, auth.uid(), v_task.employer_id, v_worker_name, p_proof_text, p_proof_url)
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

-- ----------------------------------------------------------------------------
-- RPC: approve_submission — employer approves proof; pays the worker
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

  update public.submissions
  set status = 'approved', reviewed_at = now()
  where id = p_submission_id;

  update public.profiles
  set earnings = earnings + v_reward,
      pending  = pending - v_reward
  where id = v_sub.worker_id;

  update public.profiles
  set pending = pending - v_reward,
      spent   = spent + v_reward
  where id = auth.uid();

  insert into public.transactions (user_id, type, amount, status, meta)
  values
    (v_sub.worker_id, 'earning', v_reward, 'completed', jsonb_build_object('submission_id', p_submission_id)),
    (auth.uid(), 'spend', v_reward, 'completed', jsonb_build_object('submission_id', p_submission_id));
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: reject_submission — employer rejects proof with a reason; releases
-- the reserved funds and reopens a slot on the task.
-- ----------------------------------------------------------------------------

create or replace function public.reject_submission(p_submission_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.submissions%rowtype;
  v_reward numeric(12,2);
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

  update public.submissions
  set status = 'rejected', rejection_reason = p_reason, reviewed_at = now()
  where id = p_submission_id;

  update public.profiles
  set pending = pending - v_reward
  where id = v_sub.worker_id;

  update public.profiles
  set pending   = pending - v_reward,
      deposited = deposited + v_reward
  where id = auth.uid();

  update public.tasks
  set slots_filled = greatest(slots_filled - 1, 0),
      status = 'open'
  where id = v_sub.task_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: request_withdrawal — worker cashes out approved earnings
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
begin
  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero.';
  end if;

  select earnings into v_balance from public.profiles where id = auth.uid() for update;
  if v_balance < p_amount then
    raise exception 'You cannot withdraw more than your available earnings.';
  end if;

  update public.profiles
  set earnings = earnings - p_amount,
      spent    = spent + p_amount
  where id = auth.uid();

  insert into public.withdrawals (worker_id, amount, method, account_details, status)
  values (auth.uid(), p_amount, p_method, p_account_details, 'pending')
  returning id into v_withdrawal_id;

  insert into public.transactions (user_id, type, amount, status, meta)
  values (auth.uid(), 'withdrawal', p_amount, 'pending', jsonb_build_object('method', p_method));

  return v_withdrawal_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Grant execute on RPCs to authenticated users (tables themselves stay
-- locked down to the RLS policies above).
-- ----------------------------------------------------------------------------

grant execute on function public.deposit_funds(numeric, text) to authenticated;
grant execute on function public.create_task_with_funding(text, text, text, text, numeric, int) to authenticated;
grant execute on function public.submit_task_proof(uuid, text, text) to authenticated;
grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

-- ============================================================================
-- REFERRAL & COMMISSION SHARING SYSTEM
-- ============================================================================

-- Add referral fields to profiles
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create unique index if not exists idx_profiles_referral_code on public.profiles(upper(referral_code));
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- Referral Commissions Table
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

-- ============================================================================
-- SYSTEM SETTINGS & DYNAMIC COMMISSION CONTROL
-- ============================================================================

create table if not exists public.system_settings (
  key         text primary key,
  value       text not null,
  label       text not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

insert into public.system_settings (key, value, label, description)
values
  ('referral_commission_rate', '5.00', 'Referral Commission Rate (%)', 'Percentage of task earnings or deposits awarded to the referrer.'),
  ('platform_commission_rate', '10.00', 'Platform Task Commission Rate (%)', 'Percentage deducted as platform fee from worker reward upon task approval.'),
  ('withdrawal_fee_rate', '2.00', 'Withdrawal Processing Fee (%)', 'Fee percentage deducted on worker cashout requests.')
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

create policy "system_settings_select_authenticated"
  on public.system_settings for select
  to authenticated
  using (true);

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

  insert into public.system_settings (key, value, label, updated_at, updated_by)
  values (p_key, p_value, p_key, now(), auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

grant execute on function public.admin_update_system_setting(text, text) to authenticated;

-- ============================================================================
-- NOTIFICATIONS & BROADCAST NOTIFICATION SYSTEM
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
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

create policy "notifications_select_allowed"
  on public.notifications for select
  to authenticated
  using (
    user_id = auth.uid()
    or (
      user_id is null
      and (
        target_role = 'all'
        or target_role = (select role from public.profiles where id = auth.uid())
      )
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "notification_reads_select_own"
  on public.notification_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy "notification_reads_insert_own"
  on public.notification_reads for insert
  to authenticated
  with check (user_id = auth.uid());

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


