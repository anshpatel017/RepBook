-- ============================================================================
-- DEV ONLY — create a test gym + test member so the member flow can be tried
-- before Phase 5 builds the real create-member Edge Function.
--
-- STEP 1 (dashboard, do this FIRST):
--   Authentication → Users → "Add user" → "Create new user"
--   Email:    member1@repbook.dev      ← must match exactly
--   Password: Test1234!
--   Tick "Auto Confirm User", create.
--
-- STEP 2: run this whole file in the SQL editor.
--
-- Then log in on the MEMBER tab with 9000000001 + Test1234!
-- (email login on the Admin tab works too — same account.)
--
-- Safe to re-run.
-- ============================================================================

-- ---- 0. Does step 1 actually exist? This must return one row. --------------
select id, email, phone, phone_confirmed_at
from auth.users
where email = 'member1@repbook.dev';

-- ---- 1. Test gym ----------------------------------------------------------
insert into public.gyms (id, name, city, is_active)
values ('aaaa0000-0000-4000-8000-00000000aaaa', 'Test Gym', 'Ahmedabad', true)
on conflict (id) do update set name = excluded.name, city = excluded.city, is_active = true;

-- ---- 2. Attach a confirmed phone to the auth user -------------------------
-- IMPORTANT: auth.users.phone is stored WITHOUT the leading "+" (digits only).
-- GoTrue strips the plus when normalizing a login attempt, so a value stored as
-- "+9190…" can never be matched. public.profiles.phone is our own column and
-- does keep full E.164 with the "+".
--
-- No SMS is sent: setting phone_confirmed_at is exactly what the Admin API's
-- phone_confirm: true does.
update auth.users
set phone = '919000000001',
    phone_confirmed_at = now(),
    updated_at = now()
where email = 'member1@repbook.dev';

-- ---- 3. Phone identity ----------------------------------------------------
-- The dashboard created an "email" identity only; password sign-in by phone
-- resolves through a phone identity, so it has to exist as well. Replaced
-- outright rather than skipped-if-present, so re-running repairs a bad row.
delete from auth.identities
where provider = 'phone'
  and user_id in (select id from auth.users where email = 'member1@repbook.dev');

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.phone, 'phone',
       jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
       now(), now(), now()
from auth.users u
where u.email = 'member1@repbook.dev'
  and u.phone is not null;

-- ---- 4. Profile: role, tenancy, first-run flags ---------------------------
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'member1@repbook.dev' and p.id is null;

update public.profiles p
set role                 = 'member',
    gym_id               = 'aaaa0000-0000-4000-8000-00000000aaaa',
    display_name         = 'Test Member',
    phone                = '+919000000001',
    unit                 = 'kg',
    current_week         = 1,
    is_active            = true,
    onboarded            = false,   -- so plan setup runs
    must_change_password = true     -- so the forced-change screen runs
from auth.users u
where u.id = p.id and u.email = 'member1@repbook.dev';

-- ---- 5. Verify: everything below must be filled in ------------------------
select u.email,
       u.phone                                as auth_phone,
       u.phone_confirmed_at is not null       as phone_confirmed,
       (select count(*) from auth.identities i
         where i.user_id = u.id and i.provider = 'phone') as phone_identities,
       p.role, p.display_name, p.phone        as profile_phone,
       p.is_active, p.must_change_password, p.onboarded, p.current_week
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'member1@repbook.dev';
