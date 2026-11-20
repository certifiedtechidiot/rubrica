-- Rubrica security hardening
-- Run this in the Supabase SQL editor (or via `supabase db push`) for the
-- production project. It closes the cross-tenant data exposure by enforcing
-- Row Level Security on every table and adding a server-verified admin role.
--
-- Before running:
--   1. Copy the current AI provider key into the AICREDITS_API_KEY environment
--      variable of the hosting platform, then rotate it (it has been readable
--      with the public anon key until now).
--   2. Make sure the owner account exists in auth.users, so the seed at the
--      bottom can grant it admin rights.
--
-- After running, verify from a browser/curl with ONLY the anon key. Every
-- request below must return an empty array or an error:
--   /rest/v1/system_settings?select=id
--   /rest/v1/teacher_profiles?select=id
--   /rest/v1/classrooms?select=id
--   /rest/v1/students?select=id
--   /rest/v1/evaluations?select=id
--   /rest/v1/student_profiles?select=student_id

begin;

-- ---------------------------------------------------------------------------
-- 1. Server-verified administrators
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins can read admin list" on public.app_admins;
create policy "admins can read admin list"
  on public.app_admins for select
  to authenticated
  using (public.is_admin());

-- Grant the original owner account admin rights. Add further admins by
-- inserting their auth user id into public.app_admins from the SQL editor.
insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'certifiedtechidiot@gmail.com'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS everywhere (including tables that previously had no policies)
-- ---------------------------------------------------------------------------
alter table public.classrooms       enable row level security;
alter table public.students         enable row level security;
alter table public.evaluations      enable row level security;
alter table public.student_profiles enable row level security;
alter table public.institutions     enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.system_settings  enable row level security;

-- The anon role must never touch tenant or configuration tables. The public
-- anon key ships in the client, so "anon" is effectively every visitor.
revoke all on public.system_settings  from anon;
revoke all on public.teacher_profiles from anon;
revoke all on public.institutions     from anon;
revoke all on public.student_profiles from anon;
revoke all on public.evaluations      from anon;
revoke all on public.students         from anon;
revoke all on public.classrooms       from anon;

-- ---------------------------------------------------------------------------
-- 3. Replace the old (never-applied) policies with scoped ones
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view own classrooms"   on public.classrooms;
drop policy if exists "Users can insert own classrooms" on public.classrooms;
drop policy if exists "Users can update own classrooms" on public.classrooms;
drop policy if exists "Users can delete own classrooms" on public.classrooms;

drop policy if exists "Users can view own students"   on public.students;
drop policy if exists "Users can insert own students" on public.students;
drop policy if exists "Users can update own students" on public.students;
drop policy if exists "Users can delete own students" on public.students;

drop policy if exists "Users can view own evaluations"   on public.evaluations;
drop policy if exists "Users can insert own evaluations" on public.evaluations;
drop policy if exists "Users can update own evaluations" on public.evaluations;
drop policy if exists "Users can delete own evaluations" on public.evaluations;

drop policy if exists "Users can view own student profiles"   on public.student_profiles;
drop policy if exists "Users can insert own student profiles" on public.student_profiles;
drop policy if exists "Users can update own student profiles" on public.student_profiles;
drop policy if exists "Users can delete own student profiles" on public.student_profiles;

create policy "own classrooms" on public.classrooms
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own students" on public.students
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own evaluations" on public.evaluations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own student profiles" on public.student_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Teacher profiles: a user owns exactly one row (id = auth.uid()). Admins may
-- read every profile for the admin console.
drop policy if exists "own teacher profile" on public.teacher_profiles;
drop policy if exists "admins read teacher profiles" on public.teacher_profiles;

create policy "own teacher profile" on public.teacher_profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "admins read teacher profiles" on public.teacher_profiles
  for select to authenticated
  using (public.is_admin());

-- Institutions: any signed-in user may list them (needed for onboarding).
-- Only admins may create/update/delete.
drop policy if exists "authenticated can list institutions" on public.institutions;
drop policy if exists "admins manage institutions" on public.institutions;

create policy "authenticated can list institutions" on public.institutions
  for select to authenticated
  using (true);

create policy "admins manage institutions" on public.institutions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Global settings (legacy AI key included): admin-only. The client no longer
-- reads this table; the key belongs in server environment variables.
drop policy if exists "admins manage system settings" on public.system_settings;
create policy "admins manage system settings" on public.system_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Views must respect the caller's RLS, not the view owner's
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'institution_stats'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.institution_stats set (security_invoker = on)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Enforce the institution student quota in the database
--    (the previous check ran only in the browser and was trivially bypassed)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_student_quota()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_institution uuid;
  v_max integer;
  v_count integer;
begin
  select tp.institution_id into v_institution
  from public.teacher_profiles tp
  where tp.id = new.user_id;

  if v_institution is null then
    return new;
  end if;

  select i.max_students into v_max
  from public.institutions i
  where i.id = v_institution;

  if v_max is null then
    return new;
  end if;

  select count(*) into v_count
  from public.students s
  join public.teacher_profiles tp on tp.id = s.user_id
  where tp.institution_id = v_institution;

  if v_count >= v_max then
    raise exception 'Institution student quota reached (% students)', v_max
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_student_quota_before_insert on public.students;
create trigger enforce_student_quota_before_insert
  before insert on public.students
  for each row execute function public.enforce_student_quota();

commit;

-- ---------------------------------------------------------------------------
-- 6. Remove the legacy plaintext key from the database
--    Only run this AFTER copying the value to AICREDITS_API_KEY and rotating it.
-- ---------------------------------------------------------------------------
-- update public.system_settings set api_key = null where id = 1;
