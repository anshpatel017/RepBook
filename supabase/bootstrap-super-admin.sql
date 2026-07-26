-- ============================================================================
-- RepBook — one-time bootstrap: make YOUR account the platform super admin.
--
-- There is no public signup, so create your own login by hand first:
--   1. Supabase dashboard → Authentication → Users → "Add user" → "Create new user"
--   2. Email + a password you choose, and tick "Auto Confirm User"
--   3. Copy the new user's UID, then run this file in the SQL editor.
--
-- After this, every other account in the system is created through the app:
-- super admin → gyms + gym admins, gym admin → members.
-- ============================================================================

update public.profiles
set role                 = 'super_admin',
    display_name         = 'Platform Owner',   -- your name
    gym_id               = null,               -- super admin belongs to no gym
    must_change_password = false,              -- you already chose your password
    onboarded            = true                -- skips the member plan-setup flow
where id = 'c97d8088-47bf-4dcc-93bc-0765376129d6';  -- <-- paste your auth UID here

-- Verify (must return exactly one row, role = super_admin):
select id, role, display_name, gym_id, must_change_password, onboarded
from public.profiles
where role = 'super_admin';
