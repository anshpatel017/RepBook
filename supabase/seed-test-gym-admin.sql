-- ============================================================================
-- DEV ONLY — make a gym_admin for "Test Gym" so the admin panel can be tested
-- before Phase 6 builds the super-admin UI that creates gyms properly.
--
-- STEP 1 (dashboard, FIRST):
--   Authentication → Users → "Add user" → "Create new user"
--   Email:    admin1@repbook.dev
--   Password: Admin1234!
--   Tick "Auto Confirm User", create.
--
-- STEP 2: run this file.
--
-- Then log in on the ADMIN tab with admin1@repbook.dev + Admin1234! and you
-- land on the members list for Test Gym (which already has Test Member in it).
--
-- Safe to re-run.
-- ============================================================================

-- The gym the seeded member belongs to (created by seed-test-member.sql).
insert into public.gyms (id, name, city, is_active)
values ('aaaa0000-0000-4000-8000-00000000aaaa', 'Test Gym', 'Ahmedabad', true)
on conflict (id) do update set is_active = true;

-- Safety net if the user predates the signup trigger.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'admin1@repbook.dev' and p.id is null;

update public.profiles p
set role                 = 'gym_admin',
    gym_id               = 'aaaa0000-0000-4000-8000-00000000aaaa',
    display_name         = 'Test Gym Owner',
    is_active            = true,
    onboarded            = true,   -- admins never see member plan setup
    must_change_password = false   -- set true if you want to test the forced change
from auth.users u
where u.id = p.id and u.email = 'admin1@repbook.dev';

-- Verify: one gym_admin row pointing at Test Gym.
select u.email, p.role, p.display_name, g.name as gym, p.is_active, p.must_change_password
from public.profiles p
join auth.users u on u.id = p.id
left join public.gyms g on g.id = p.gym_id
where u.email = 'admin1@repbook.dev';
