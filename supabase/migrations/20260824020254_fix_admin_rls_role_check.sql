/*
# Fix admin RLS role checks

## Overview
Replaces recursive admin checks in Row Level Security policies with a SECURITY DEFINER helper function. The previous policies queried `profiles` from within the `profiles` policy, which can recurse and prevent admin reads.

## Security
- Adds `is_admin()` with a fixed `search_path` and authenticated-only execution.
- The function reads the caller's role as a privileged server-side check.
- Replaces admin predicates across all protected tables.
*/

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

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "tasks_select_open_or_own_or_admin" on public.tasks;
create policy "tasks_select_open_or_own_or_admin"
  on public.tasks for select
  to authenticated
  using (status = 'open' or employer_id = auth.uid() or public.is_admin());

drop policy if exists "submissions_select_own_or_admin" on public.submissions;
create policy "submissions_select_own_or_admin"
  on public.submissions for select
  to authenticated
  using (worker_id = auth.uid() or employer_id = auth.uid() or public.is_admin());

drop policy if exists "transactions_select_own_or_admin" on public.transactions;
create policy "transactions_select_own_or_admin"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "withdrawals_select_own_or_admin" on public.withdrawals;
create policy "withdrawals_select_own_or_admin"
  on public.withdrawals for select
  to authenticated
  using (worker_id = auth.uid() or public.is_admin());

drop policy if exists "deposit_requests_select_own_or_admin" on public.deposit_requests;
create policy "deposit_requests_select_own_or_admin"
  on public.deposit_requests for select
  to authenticated
  using (employer_id = auth.uid() or public.is_admin());

drop policy if exists "platform_earnings_select_admin" on public.platform_earnings;
create policy "platform_earnings_select_admin"
  on public.platform_earnings for select
  to authenticated
  using (public.is_admin());
