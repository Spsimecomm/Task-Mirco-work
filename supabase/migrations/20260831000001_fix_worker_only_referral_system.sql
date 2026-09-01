-- ============================================================================
-- Migration: 20260831000001_fix_worker_only_referral_system.sql
-- Description:
-- 1. Dynamic Unique Referral Code Generator (e.g. SHIM5081, TANV4920)
-- 2. Worker-Only Referral Constraint:
--    - referral_code and referred_by apply exclusively to 'worker' role.
--    - employers and admins have referral_code = null and referred_by = null.
-- 3. Fix Profiles RLS Policy so workers can query profiles they referred (referred_by = auth.uid()).
-- 4. Backfill existing worker profiles with unique codes & clean non-worker profiles.
-- 5. Updated handle_new_user() trigger and process_referral_commission() function.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Unique Referral Code Generator Function
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
  -- Extract 3-4 clean uppercase letters from name, default to 'WORK'
  v_prefix := upper(substring(regexp_replace(coalesce(p_full_name, ''), '[^a-zA-Z]', '', 'g') from 1 for 4));
  if length(v_prefix) < 3 then
    v_prefix := 'WORK';
  end if;

  loop
    -- Generate code: e.g. SHIM5081, TANV7392
    v_code := v_prefix || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
    select exists(select 1 from public.profiles where upper(referral_code) = v_code) into v_exists;
    if not v_exists then
      return v_code;
    end if;
    v_attempts := v_attempts + 1;
    if v_attempts > 30 then
      -- Fallback to random alphanumeric string
      v_code := 'WRK' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 5));
      return v_code;
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Backfill existing Worker profiles & clean Employer/Admin profiles
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Generate unique referral codes for all workers missing a valid unique code
  for r in 
    select id, full_name 
    from public.profiles 
    where role = 'worker' 
      and (referral_code is null or referral_code = '' or referral_code = 'TASKLY')
  loop
    update public.profiles
    set referral_code = public.generate_unique_referral_code(r.full_name)
    where id = r.id;
  end loop;

  -- Ensure non-workers (employer, admin) have null referral_code and referred_by
  update public.profiles
  set referral_code = null,
      referred_by = null
  where role in ('employer', 'admin');
end;
$$;

-- Enforce indexes on profiles
create unique index if not exists idx_profiles_referral_code on public.profiles(upper(referral_code)) where referral_code is not null;
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- ----------------------------------------------------------------------------
-- 3. Fix Row Level Security (RLS) Policy on profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_select_referred" on public.profiles;

create policy "profiles_select_policy"
  on public.profiles for select
  to authenticated
  using (
    -- 1. Users can always read their own profile row
    auth.uid() = id
    -- 2. Referrers can read the profile summary of users they referred
    or referred_by = auth.uid()
    -- 3. Employers can see profiles of workers who submitted to their tasks
    or exists (
      select 1 from public.submissions s
      where s.employer_id = auth.uid() and s.worker_id = profiles.id
    )
    -- 4. Admins can read all profiles
    or exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Update handle_new_user() trigger with Worker-Only Referral constraints
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
  v_my_ref_code text := null;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'worker');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', 'New user');

  -- Enforce valid roles
  if v_role not in ('worker', 'employer', 'admin') then
    v_role := 'worker';
  end if;

  -- Worker-only referral handling
  if v_role = 'worker' then
    -- Extract referral code passed during registration
    v_ref_code := upper(btrim(coalesce(
      new.raw_user_meta_data->>'referral_code',
      new.raw_user_meta_data->>'ref',
      new.raw_user_meta_data->>'referred_by',
      ''
    )));

    if v_ref_code <> '' then
      -- Find referrer by code: must be a worker and not self
      select id into v_referrer_id
      from public.profiles
      where upper(referral_code) = v_ref_code
        and role = 'worker'
        and id <> new.id
      limit 1;
    end if;

    -- Generate unique referral code for this worker
    v_my_ref_code := public.generate_unique_referral_code(v_full_name);
  else
    -- Employer / Admin roles cannot refer or have referral codes
    v_my_ref_code := null;
    v_referrer_id := null;
  end if;

  insert into public.profiles (
    id,
    full_name,
    role,
    referral_code,
    referred_by,
    earnings,
    pending,
    spent,
    deposited
  )
  values (
    new.id,
    v_full_name,
    v_role,
    v_my_ref_code,
    v_referrer_id,
    0.00,
    0.00,
    0.00,
    0.00
  );

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Commission processing with strict Worker-Only Referrer payout
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
    return null; -- No referrer or self-referral
  end if;

  -- 2. Lock referrer profile row and verify role is strictly 'worker'
  select role into v_referrer_role
  from public.profiles
  where id = v_referrer_id
  for update;

  if v_referrer_role is distinct from 'worker' then
    return null; -- Referral system strictly benefits worker role
  end if;

  -- 3. Calculate commission amount (rounded to 2 decimal places)
  v_commission_amount := round((p_eligible_amount * p_rate / 100)::numeric, 2);
  if v_commission_amount <= 0 then
    return null;
  end if;

  -- 4. Record in referral_commissions ledger (idempotent)
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
      return null; -- Duplicate prevention
  end;

  -- 5. Credit worker referrer's earnings
  update public.profiles
  set earnings = earnings + v_commission_amount
  where id = v_referrer_id;

  -- 6. Financial transaction log
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
