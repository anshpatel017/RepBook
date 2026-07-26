-- ============================================================================
-- Backfill profiles for auth users created BEFORE the signup trigger existed.
--
-- The on_auth_user_created trigger (0001_init.sql) only fires for new users, so
-- an account created in the dashboard before `db push` has no profiles row —
-- and a user with no profile has no role, so the app signs them straight out.
--
-- Safe to re-run.
-- ============================================================================

-- 1. What's out of sync right now?
select u.id, u.email, u.phone, (p.id is not null) as has_profile, p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- 2. Create the missing rows (defaults: role 'member', is_active true).
insert into public.profiles (id)
select u.id
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 3. Re-apply the super admin bootstrap now that the row exists.
update public.profiles
set role                 = 'super_admin',
    display_name         = 'Platform Owner',
    gym_id               = null,
    must_change_password = false,
    onboarded            = true,
    is_active            = true
where id = 'c97d8088-47bf-4dcc-93bc-0765376129d6';

-- 4. Verify: your row must be super_admin, active, and not forced to change.
select p.id, u.email, p.role, p.is_active, p.must_change_password, p.onboarded
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at;
