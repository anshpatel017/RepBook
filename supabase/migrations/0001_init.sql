-- ============================================================================
-- RepBook — initial schema (docs/03-architecture.md §1)
--
-- Invariants encoded here:
--   * Multi-tenant: every profile belongs to at most one gym.
--   * Weeks are integers (week_number), never calendar dates.
--   * Weights are stored in kg only; lb is a display conversion.
--   * Sunday never exists in data: day_of_week is 1 (Mon) .. 6 (Sat).
--   * Renaming an exercise keeps its history (sets reference exercise id).
--   * Deleting an exercise is a soft archive (archived_at).
--   * Members see only their own rows. Gym admins see aggregates, never logs.
-- ============================================================================

-- ============ GYMS (tenants) ============
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('super_admin','gym_admin','member')),
  gym_id uuid references public.gyms(id),
  display_name text,
  phone text unique,                        -- E.164, members only
  unit text not null default 'kg' check (unit in ('kg','lb')),
  current_week int not null default 1 check (current_week >= 1),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  onboarded boolean not null default false, -- plan setup completed
  created_at timestamptz not null default now()
);
create index if not exists profiles_gym_idx on public.profiles (gym_id, role);

-- ============ EXERCISES (the plan) ============
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6), -- 1=Mon … 6=Sat
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists exercises_user_day_idx on public.exercises (user_id, day_of_week, position);

-- ============ SETS (the logs) ============
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  set_number int not null check (set_number between 1 and 20),
  weight_kg numeric(5,2) check (weight_kg >= 0 and weight_kg <= 999.5),
  reps int check (reps between 0 and 100),
  logged_at timestamptz not null default now(),
  unique (exercise_id, week_number, set_number)   -- auto-save upsert target
);
create index if not exists sets_user_week_idx on public.workout_sets (user_id, week_number);
create index if not exists sets_exercise_idx  on public.workout_sets (exercise_id, week_number);

-- ============ TEMPLATES ============
create table if not exists public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_public boolean not null default true
);
create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.plan_templates(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6),
  name text not null,
  position int not null default 0
);
create index if not exists template_exercises_template_idx
  on public.template_exercises (template_id, day_of_week, position);

-- ============================================================================
-- Role helpers (security definer → read profiles without re-entering its RLS,
-- which would otherwise recurse when a profiles policy needs the caller's role)
-- ============================================================================
create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.auth_gym() returns uuid
language sql stable security definer set search_path = public as
$$ select gym_id from profiles where id = auth.uid() $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.gyms               enable row level security;
alter table public.exercises          enable row level security;
alter table public.workout_sets       enable row level security;
alter table public.plan_templates     enable row level security;
alter table public.template_exercises enable row level security;

-- ---- profiles ----
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- Users edit their own profile (name, unit, current_week, onboarded) but can
-- never change their own role or move themselves to another gym.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.auth_role()
    and coalesce(gym_id, '00000000-0000-0000-0000-000000000000')
      = coalesce(public.auth_gym(), '00000000-0000-0000-0000-000000000000')
  );

drop policy if exists "admin reads own gym members" on public.profiles;
create policy "admin reads own gym members" on public.profiles
  for select using (public.auth_role() = 'gym_admin' and gym_id = public.auth_gym());

drop policy if exists "super reads all profiles" on public.profiles;
create policy "super reads all profiles" on public.profiles
  for select using (public.auth_role() = 'super_admin');

-- No insert/delete policy on purpose: rows are created by the signup trigger
-- and mutated by Edge Functions (service role bypasses RLS).

-- ---- gyms ----
drop policy if exists "admin reads own gym" on public.gyms;
create policy "admin reads own gym" on public.gyms
  for select using (id = public.auth_gym());

drop policy if exists "super full access gyms" on public.gyms;
create policy "super full access gyms" on public.gyms
  for all using (public.auth_role() = 'super_admin')
  with check (public.auth_role() = 'super_admin');

-- ---- member data: owner-only (admins get aggregates via the functions below) ----
drop policy if exists "own exercises" on public.exercises;
create policy "own exercises" on public.exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own sets" on public.workout_sets;
create policy "own sets" on public.workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---- templates: read-only for signed-in users (seeded via migration) ----
drop policy if exists "read templates" on public.plan_templates;
create policy "read templates" on public.plan_templates
  for select using (is_public);

drop policy if exists "read template exs" on public.template_exercises;
create policy "read template exs" on public.template_exercises
  for select using (true);

-- ============================================================================
-- Grants: the anon key must not reach application data at all. Everything is
-- done by signed-in users (authenticated) or by Edge Functions (service_role,
-- which bypasses RLS).
-- ============================================================================
revoke all on public.gyms, public.profiles, public.exercises, public.workout_sets,
               public.plan_templates, public.template_exercises from anon;

grant select, insert, update, delete
  on public.profiles, public.exercises, public.workout_sets to authenticated;
grant select on public.gyms, public.plan_templates, public.template_exercises to authenticated;
grant insert, update, delete on public.gyms to authenticated;  -- gated to super_admin by RLS

revoke all on function public.auth_role(), public.auth_gym() from anon;
grant execute on function public.auth_role(), public.auth_gym() to authenticated;

-- ============================================================================
-- Profile auto-create on signup (Admin API createUser → profiles row exists
-- before the Edge Function attaches role/gym/phone)
-- ============================================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Aggregates for admins / super admin (privacy: no raw logs ever leave here)
-- ============================================================================

-- Gym admin: activity of their own gym's members.
create or replace function public.gym_member_activity()
returns table (id uuid, display_name text, phone text, is_active boolean,
               last_workout_at timestamptz, weeks_logged bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.phone, p.is_active,
         max(s.logged_at), count(distinct s.week_number)
  from profiles p
  left join workout_sets s on s.user_id = p.id
  where p.role = 'member'
    and p.gym_id = public.auth_gym()
    and public.auth_role() = 'gym_admin'
  group by p.id
$$;

-- Super admin: one row per gym.
create or replace function public.platform_stats()
returns table (gym_id uuid, gym_name text, city text, is_active boolean,
               members bigint, active_members_30d bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.city, g.is_active,
    count(distinct p.id) filter (where p.role = 'member'),
    count(distinct s.user_id) filter (where s.logged_at > now() - interval '30 days')
  from gyms g
  left join profiles p on p.gym_id = g.id
  left join workout_sets s on s.user_id = p.id
  where public.auth_role() = 'super_admin'
  group by g.id
$$;

revoke all on function public.gym_member_activity(), public.platform_stats() from anon;
grant execute on function public.gym_member_activity(), public.platform_stats() to authenticated;

comment on function public.gym_member_activity() is
  'Gym admin view of their members: aggregates only, never raw workout logs.';
comment on function public.platform_stats() is
  'Super admin view: per-gym member + 30-day-active counts.';
