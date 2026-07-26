# RepBook — Technical Architecture (B2B Edition)

**Stack:** React Native (Expo) · TypeScript · Supabase (Auth, Postgres, RLS, Edge Functions)

```
┌─────────────────────────────────────────────────────┐
│                    MOBILE APP                       │
│  Expo + TS  ·  expo-router  ·  TanStack Query       │
│  Role-routed UIs: member / gym_admin / super_admin  │
└──────────┬────────────────────────────┬─────────────┘
           │ supabase-js (anon key)     │ functions.invoke()
           ▼                            ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│  SUPABASE CORE      │   │  EDGE FUNCTIONS (Deno)      │
│  Auth (phone+email) │   │  create-member              │
│  Postgres + RLS     │◄──│  reset-member-password      │
│  Views/SQL fns      │   │  set-member-active          │
└─────────────────────┘   │  create-gym                 │
                          │  (service-role key HERE only)│
                          └─────────────────────────────┘
```

Principles: no custom server; RLS is the security layer for reads/writes; anything needing the Admin API (account provisioning, bans) lives in Edge Functions that verify the caller's role first.

---

## 1. Database Schema (single from-zero migration)

Decisions: week-number model (not dates) · weights stored in kg · rename-safe exercises (sets reference id) · soft-delete exercises · Sunday never stored · roles+tenancy on profiles.

```sql
-- ============ GYMS (tenants) ============
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('super_admin','gym_admin','member')),
  gym_id uuid references public.gyms(id),
  display_name text,
  phone text unique,                       -- E.164, members only
  unit text not null default 'kg' check (unit in ('kg','lb')),
  current_week int not null default 1 check (current_week >= 1),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  onboarded boolean not null default false, -- plan setup completed
  created_at timestamptz not null default now()
);
create index profiles_gym_idx on public.profiles (gym_id, role);

-- ============ EXERCISES (the plan) ============
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6), -- 1=Mon…6=Sat
  name text not null check (char_length(name) between 1 and 80),
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index exercises_user_day_idx on public.exercises (user_id, day_of_week, position);

-- ============ SETS (the logs) ============
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  set_number int not null check (set_number between 1 and 20),
  weight_kg numeric(5,2) check (weight_kg >= 0 and weight_kg <= 999.5),
  reps int check (reps between 0 and 100),
  logged_at timestamptz not null default now(),
  unique (exercise_id, week_number, set_number)
);
create index sets_user_week_idx on public.workout_sets (user_id, week_number);
create index sets_exercise_idx  on public.workout_sets (exercise_id, week_number);

-- ============ TEMPLATES (P1) ============
create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_public boolean not null default true
);
create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.plan_templates(id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 6),
  name text not null,
  position int not null default 0
);
```

### Role helpers (security definer → no recursive RLS)

```sql
create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.auth_gym() returns uuid
language sql stable security definer set search_path = public as
$$ select gym_id from profiles where id = auth.uid() $$;
```

### Row Level Security

```sql
alter table public.profiles          enable row level security;
alter table public.gyms              enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.plan_templates    enable row level security;
alter table public.template_exercises enable row level security;

-- profiles
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and coalesce(gym_id, '00000000-0000-0000-0000-000000000000')
      = coalesce((select gym_id from public.profiles where id = auth.uid()),
                 '00000000-0000-0000-0000-000000000000'));
  -- users edit their profile but never their own role/gym
create policy "admin reads own gym members" on public.profiles
  for select using (public.auth_role() = 'gym_admin' and gym_id = public.auth_gym());
create policy "super reads all profiles" on public.profiles
  for select using (public.auth_role() = 'super_admin');

-- gyms
create policy "admin reads own gym" on public.gyms
  for select using (id = public.auth_gym());
create policy "super full access gyms" on public.gyms
  for all using (public.auth_role() = 'super_admin')
  with check (public.auth_role() = 'super_admin');

-- member data: owner-only (admins get aggregates via functions below)
create policy "own exercises" on public.exercises
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sets" on public.workout_sets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- templates: read-only for everyone (seeded via migration)
create policy "read templates"     on public.plan_templates     for select using (is_public);
create policy "read template exs"  on public.template_exercises for select using (true);
```

### Profile auto-create on signup

```sql
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Aggregates for admins / super admin

```sql
-- Gym admin: member activity (NO raw logs)
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

-- Super admin: platform stats
create or replace function public.platform_stats()
returns table (gym_id uuid, gym_name text, city text, is_active boolean,
               members bigint, active_members_30d bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.city, g.is_active,
    count(p.id) filter (where p.role = 'member'),
    count(distinct s.user_id) filter (where s.logged_at > now() - interval '30 days')
  from gyms g
  left join profiles p on p.gym_id = g.id
  left join workout_sets s on s.user_id = p.id
  where public.auth_role() = 'super_admin'
  group by g.id
$$;
```

### Bootstrap super admin (run once, manually)

```sql
-- sign up your own account first (email+password via a temporary signup or dashboard), then:
update public.profiles set role = 'super_admin', must_change_password = false where id = '<your-auth-uid>';
```

---

## 2. Edge Functions

Full code in `05-b2b-multitenancy.md`. Contract summary:

| Function | Caller | Input | Output | Does |
|----------|--------|-------|--------|------|
| `create-member` | gym_admin | phone (E.164), name | { phone, password } once | Admin API createUser(phone, phone_confirm:true) + profile→member/gym |
| `reset-member-password` | gym_admin (same gym) | memberId | { password } once | updateUserById(password) + must_change_password=true |
| `set-member-active` | gym_admin (same gym) | memberId, active | ok | ban/unban + profiles.is_active |
| `create-gym` | super_admin | name, city, ownerName, ownerEmail | { gymId, email, password } once | insert gym + createUser(email) + profile→gym_admin |

Rules: every function re-verifies caller role from `profiles` via the caller's JWT; validates tenant ownership before touching a member; service-role key never leaves functions.

---

## 3. Frontend Architecture (Expo)

### Folder structure

```
repbook/
├── app/
│   ├── (auth)/login.tsx              # Member(phone)/Admin(email) tabs
│   ├── change-password.tsx           # forced, blocking
│   ├── (onboarding)/plan-setup.tsx   # member first run
│   ├── (tabs)/_layout.tsx            # member tabs: Home, Charts
│   ├── (tabs)/index.tsx
│   ├── (tabs)/charts.tsx
│   ├── day/[day].tsx
│   ├── log/[day]/[week].tsx
│   ├── (admin)/_layout.tsx           # gym_admin stack
│   ├── (admin)/members.tsx
│   ├── (admin)/add-member.tsx
│   ├── (super)/_layout.tsx           # super_admin stack
│   ├── (super)/dashboard.tsx
│   ├── (super)/add-gym.tsx
│   ├── settings.tsx
│   └── _layout.tsx                   # session + role router
├── src/
│   ├── lib/supabase.ts               # client init (expo-secure-store session)
│   ├── lib/units.ts                  # kg<->lb display conversion
│   ├── lib/phone.ts                  # E.164 normalize (+91 default)
│   ├── api/plan.ts sets.ts charts.ts admin.ts super.ts   # ALL supabase calls
│   ├── hooks/useProfile.ts useDayLog.ts usePlan.ts useChartData.ts useMembers.ts usePlatformStats.ts
│   ├── stores/ui.ts                  # zustand: theme, unit
│   ├── components/ ExerciseCard SetRow WeekChips DayGrid StatCard MemberRow CredentialCard
│   │   └── charts/ ComparisonBars TrendLine
│   ├── types/db.ts                   # supabase gen types
│   └── theme/tokens.ts
├── supabase/
│   ├── migrations/0001_init.sql      # everything in section 1
│   └── functions/create-member/ reset-member-password/ set-member-active/ create-gym/
├── app.json · app.config.ts · package.json
```

### Libraries

| Concern | Choice |
|---------|--------|
| Framework | Expo SDK (managed) + TypeScript strict, expo-router |
| Server state | @tanstack/react-query (+ persistQueryClient/AsyncStorage) |
| Client state | zustand (theme/unit only) |
| Backend | @supabase/supabase-js + expo-secure-store |
| Charts | victory-native |
| Sharing | expo-clipboard, react-native Share (WhatsApp prefill) |

### Root routing logic

```
_layout.tsx:
  session = supabase.auth.onAuthStateChange
  !session                    → /(auth)/login
  profile.must_change_password → /change-password
  role member && !onboarded   → /(onboarding)/plan-setup
  role member                 → /(tabs)
  role gym_admin              → /(admin)/members
  role super_admin            → /(super)/dashboard
```

### Auto-save data flow (Log screen)

```
type "72.5" → local state instantly → debounce 500ms
→ upsert workout_sets on (exercise_id, week_number, set_number)   [react-query mutation]
→ onError: rollback + toast + 3x retry backoff
→ onSuccess: invalidate ['dayLog', day, week] and ['charts']
```

### Key queries (member)

```sql
-- Log screen (plan + logs for one day/week)
select e.id, e.name, e.position, s.set_number, s.weight_kg, s.reps
from exercises e
left join workout_sets s on s.exercise_id = e.id and s.week_number = $week
where e.user_id = auth.uid() and e.day_of_week = $day and e.archived_at is null
order by e.position, s.set_number;

-- Comparison: best set per exercise for two weeks (group by exercise, week)
-- Trend: max(weight_kg) per week for one exercise
```

---

## 4. Offline Strategy

v1: react-query persisted cache → instant offline reads; writes require network (clear error + auto retry). v1.5: persisted mutation queue, replay on reconnect, last-write-wins per set (safe: unique key per set, single user).

## 5. Environments & DevOps

| Item | Tool |
|------|------|
| Repo/CI | GitHub · Actions: typecheck, lint on PR |
| Supabase | Two projects: repbook-dev, repbook-prod · `supabase db push` · migrations in repo |
| Functions | `supabase functions deploy <name>` (dev + prod) |
| Types | `supabase gen types typescript > src/types/db.ts` |
| Builds | EAS Build (dev/preview/production) · EAS Update for JS fixes |
| Monitoring | Sentry (sentry-expo) · PostHog at v1.0 |
| Secrets | App ships only SUPABASE_URL + ANON key (via app.config.ts env). Service-role key: Edge Functions env only |

## 6. Scale Path

Gym leaderboards → SQL view over workout_sets grouped by gym_id/week (opt-in flag). Share cards → Edge Function image render → Storage. Heavy chart aggregations → materialized views. Custom API layer only if something forces it.
