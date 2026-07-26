# RepBook — B2B Multi-Tenancy (Gyms, Admins, Super Admin)

> Extends `03-architecture.md`. Business model: sell to gyms → gym owner (admin) creates member accounts (ID = phone number) → members use the tracker. You (super admin) see the whole platform.

---

## 1. Roles & Access

| Role | Who | Can do | Can see |
|------|-----|--------|---------|
| `super_admin` | You (developer) | Create gyms + gym-admin accounts, deactivate gyms | All gyms, member counts, activity stats |
| `gym_admin` | Gym owner (1+ per gym) | Add/deactivate members, reset passwords, view member activity | Only their gym's members |
| `member` | Gym member | Log workouts (existing app) | Only their own data |

**Login identities:** members = phone + password · admins & super admin = email + password.

---

## 2. Schema Migration

```sql
-- ============ GYMS (tenants) ============
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ PROFILES: add tenancy + role ============
alter table public.profiles
  add column role text not null default 'member'
    check (role in ('super_admin','gym_admin','member')),
  add column gym_id uuid references public.gyms(id),
  add column phone text unique,
  add column is_active boolean not null default true,
  add column must_change_password boolean not null default false;

create index profiles_gym_idx on public.profiles (gym_id, role);
```

### Role helper functions (avoid recursive RLS)

```sql
create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function public.auth_gym() returns uuid
language sql stable security definer set search_path = public as
$$ select gym_id from profiles where id = auth.uid() $$;
```

### RLS

```sql
alter table public.gyms enable row level security;

-- profiles: replace the old "own profile" policy
drop policy if exists "own profile" on public.profiles;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
  -- users can edit their profile but never their own role

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
```

**Workout data stays private to the member.** Gym admins see *activity* (aggregates below), not the member's actual logs. (If you later want admins to see full logs, add one policy — but privacy is a selling point.)

### Activity visible to admins (aggregate only)

```sql
create or replace view public.v_member_activity
with (security_invoker = false) as   -- definer view, gated inside
select p.id, p.display_name, p.phone, p.gym_id, p.is_active,
       max(s.logged_at) as last_workout_at,
       count(distinct s.week_number) as weeks_logged
from profiles p
left join workout_sets s on s.user_id = p.id
where p.role = 'member'
group by p.id;

create or replace function public.gym_member_activity()
returns setof public.v_member_activity
language sql stable security definer set search_path = public as $$
  select * from v_member_activity
  where gym_id = public.auth_gym() and public.auth_role() = 'gym_admin'
$$;
```

### Platform stats (super admin)

```sql
create or replace function public.platform_stats()
returns table (gym_id uuid, gym_name text, is_active boolean,
               members bigint, active_members_30d bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.is_active,
    count(p.id) filter (where p.role = 'member'),
    count(distinct s.user_id) filter (where s.logged_at > now() - interval '30 days')
  from gyms g
  left join profiles p on p.gym_id = g.id
  left join workout_sets s on s.user_id = p.id
  where public.auth_role() = 'super_admin'
  group by g.id
$$;
```

### Seed yourself as super admin (run once)

```sql
-- after you sign up normally with your email:
update public.profiles set role = 'super_admin' where id = '<your-auth-uid>';
```

---

## 3. Edge Functions (server-side admin actions)

Service-role key lives ONLY here. Every function: verify caller → act → return.

### `create-member`

```ts
// supabase/functions/create-member/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function genPassword(len = 8) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no confusing chars
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  try {
    // 1. Identify caller with their own JWT
    const userClient = createClient(URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: caller } = await userClient
      .from("profiles").select("role, gym_id").eq("id", user.id).single();
    if (caller?.role !== "gym_admin" || !caller.gym_id)
      return json({ error: "forbidden" }, 403);

    // 2. Validate input
    const { phone, name } = await req.json();
    if (!/^\+[1-9]\d{7,14}$/.test(phone))
      return json({ error: "phone must be E.164, e.g. +919876543210" }, 400);

    // 3. Create auth user (no SMS sent — phone_confirm bypasses OTP)
    const admin = createClient(URL, SERVICE);
    const password = genPassword();
    const { data: created, error } = await admin.auth.admin.createUser({
      phone, password, phone_confirm: true,
      user_metadata: { name },
    });
    if (error) return json({ error: error.message }, 400);

    // 4. Attach to gym (profile row already exists via signup trigger)
    await admin.from("profiles").update({
      role: "member", gym_id: caller.gym_id, display_name: name,
      phone, must_change_password: true,
    }).eq("id", created.user.id);

    // 5. Return credentials ONCE — admin shares them with the member
    return json({ phone, password });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
```

### `reset-member-password`

Same caller check, then:
```ts
const password = genPassword();
await admin.auth.admin.updateUserById(memberId, { password });
await admin.from("profiles").update({ must_change_password: true }).eq("id", memberId);
// verify member belongs to caller's gym BEFORE updating:
// select gym_id from profiles where id = memberId → must equal caller.gym_id
return json({ password });
```

### `set-member-active`

```ts
// deactivate: ban login + flag profile
await admin.auth.admin.updateUserById(memberId, { ban_duration: active ? "none" : "876000h" });
await admin.from("profiles").update({ is_active: active }).eq("id", memberId);
```

### `create-gym` (super admin only)

Caller check `role === 'super_admin'`, then:
```ts
const { data: gym } = await admin.from("gyms").insert({ name, city }).select().single();
const password = genPassword(10);
const { data: owner } = await admin.auth.admin.createUser({
  email: ownerEmail, password, email_confirm: true,
});
await admin.from("profiles").update({
  role: "gym_admin", gym_id: gym.id, display_name: ownerName,
  must_change_password: true,
}).eq("id", owner.user.id);
return json({ gymId: gym.id, email: ownerEmail, password });
```

Deploy: `npx supabase functions deploy create-member` (etc.). Secrets are auto-injected.

---

## 4. Client Changes (React Native)

### Login screen → two modes

```ts
// Member (default tab): phone + password
await supabase.auth.signInWithPassword({ phone: "+91...", password });
// Admin tab: email + password
await supabase.auth.signInWithPassword({ email, password });
```

### Role-based routing (root layout)

```
session? ──no──► /(auth)/login
  │yes
  profile.must_change_password? ──yes──► /change-password (blocking)
  │no
  profile.role:
    'member'      → /(tabs)            // existing app, untouched
    'gym_admin'   → /(admin)/members
    'super_admin' → /(super)/dashboard
```

### New screens

```
app/(admin)/members.tsx        # list: name, phone, last workout, active badge
app/(admin)/add-member.tsx     # form → calls create-member fn → shows phone+password once with [Copy] [Share on WhatsApp]
app/(super)/dashboard.tsx      # totals: gyms, members, active-30d + gym table (from platform_stats())
app/(super)/add-gym.tsx        # form → create-gym fn → shows admin credentials once
app/change-password.tsx        # forced first-login password change → clears must_change_password
```

Calling a function from the app:
```ts
const { data, error } = await supabase.functions.invoke("create-member", {
  body: { phone, name },
});
// data = { phone, password } → display once, never stored client-side
```

Change password:
```ts
await supabase.auth.updateUser({ password: newPassword });
await supabase.from("profiles").update({ must_change_password: false }).eq("id", uid);
```

---

## 5. Flows (end to end)

**You onboard a gym (sale closed):**
1. Super dashboard → Add gym → name + owner email
2. App shows owner's email + temp password → you send it to the gym owner

**Gym admin adds a member:**
1. Admin panel → Add member → name + phone (+91…)
2. Screen shows `phone / password` once → [Share on WhatsApp] button
3. Member installs app → logs in with phone + password → forced to set own password → lands in tracker

**Member stops paying:**
Admin → member row → Deactivate → login banned instantly.

**Member forgot password:**
Admin → member row → Reset password → new temp password → share again.

---

## 6. Build Order (add to essentials checklist)

1. Migration: gyms table + profile columns + helper fns + RLS + views/fns
2. Edge Functions: create-member → reset-member-password → set-member-active → create-gym
3. Login screen: phone/email tabs + forced password change screen
4. Role routing in root layout
5. Admin screens (members list, add member w/ credential share)
6. Super screens (dashboard stats, add gym)
7. Seed your super_admin row · test all 3 roles on device

## 7. Notes

- **Zero SMS cost**: no OTP anywhere; credentials flow through the gym admin. If you later want self-serve password reset, plug an SMS provider into Supabase and add OTP — schema doesn't change.
- **Phone format**: always store E.164 (`+919876543210`). Normalize input (strip spaces/dashes, prepend +91 default for India).
- **Gym-scoped social** (phase 2 gold): leaderboards *within a gym* — "who lifted most this week at FitZone" — big retention feature for gym owners, easy with `gym_id` already on every profile.
- **Pricing model to test**: per-gym flat (e.g. ₹X/month up to 200 members) beats per-member for small Indian gyms — simpler invoice, no counting fights.
- **Keep B2C door open**: a self-signup user just has `gym_id = null` — both models run on the same schema.
