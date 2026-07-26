-- ============================================================================
-- RepBook — RLS smoke test (Phase 1 checkpoint).
--
-- HOW TO RUN: paste this whole file into the Supabase dashboard SQL editor and
-- hit Run ONCE. It returns a results table — every row must say PASS.
--
-- It creates a few throwaway users/gyms with fixed ids, impersonates them via
-- `set local role authenticated` + JWT claims (which is what the app does), and
-- deletes everything it created at the end. Safe to re-run.
-- ============================================================================

create temporary table if not exists _rls_results (ord int, check_name text, result text);
delete from _rls_results;

-- ------------------------------------------------------------- cleanup old --
delete from auth.users where id in (
  'f0000000-0000-4000-8000-00000000000a',
  'f0000000-0000-4000-8000-00000000000b',
  'f0000000-0000-4000-8000-0000000000ad'
);
delete from public.gyms where id in (
  'f0000000-0000-4000-8000-0000000000a1',
  'f0000000-0000-4000-8000-0000000000b1'
);

-- ---------------------------------------------------------------- fixtures --
insert into public.gyms (id, name, city) values
  ('f0000000-0000-4000-8000-0000000000a1', 'RLS Test Gym A', 'Ahmedabad'),
  ('f0000000-0000-4000-8000-0000000000b1', 'RLS Test Gym B', 'Surat');

-- profiles rows appear automatically via the on_auth_user_created trigger.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at)
values
  ('f0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'member-a@rls.test', 'x', now(), now(), now()),
  ('f0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'member-b@rls.test', 'x', now(), now(), now()),
  ('f0000000-0000-4000-8000-0000000000ad', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin-a@rls.test', 'x', now(), now(), now());

update public.profiles set role = 'member', gym_id = 'f0000000-0000-4000-8000-0000000000a1',
       display_name = 'Member A', phone = '+919000000001'
where id = 'f0000000-0000-4000-8000-00000000000a';

update public.profiles set role = 'member', gym_id = 'f0000000-0000-4000-8000-0000000000b1',
       display_name = 'Member B', phone = '+919000000002'
where id = 'f0000000-0000-4000-8000-00000000000b';

update public.profiles set role = 'gym_admin', gym_id = 'f0000000-0000-4000-8000-0000000000a1',
       display_name = 'Admin A'
where id = 'f0000000-0000-4000-8000-0000000000ad';

insert into public.exercises (id, user_id, day_of_week, name, position) values
  ('f0000000-0000-4000-8000-0000000000e1', 'f0000000-0000-4000-8000-00000000000a', 1, 'Bench press', 0),
  ('f0000000-0000-4000-8000-0000000000e2', 'f0000000-0000-4000-8000-00000000000b', 1, 'Bench press', 0);

insert into public.workout_sets (user_id, exercise_id, week_number, set_number, weight_kg, reps) values
  ('f0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000e1', 1, 1, 60, 10),
  ('f0000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-0000000000e2', 1, 1, 80, 8);

-- ------------------------------------------------------------------- tests --
create or replace function pg_temp.verdict(ok boolean) returns text
language sql immutable as $$ select case when ok then 'PASS' else 'FAIL' end $$;

do $$
declare
  member_a uuid := 'f0000000-0000-4000-8000-00000000000a';
  member_b uuid := 'f0000000-0000-4000-8000-00000000000b';
  admin_a  uuid := 'f0000000-0000-4000-8000-0000000000ad';
  own_sets int; other_sets int; own_ex int; visible_profiles int; templates int;
  admin_sets int; admin_members int; admin_activity int; admin_platform int; admin_gyms int;
  member_activity int; escalated boolean; wrote_other boolean;
begin
  ---------------------------------------------------------------- member A --
  perform set_config('request.jwt.claims',
    json_build_object('sub', member_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into own_sets from public.workout_sets;
  select count(*) into other_sets from public.workout_sets where user_id = member_b;
  select count(*) into own_ex from public.exercises;
  select count(*) into visible_profiles from public.profiles;
  select count(*) into templates from public.plan_templates;
  select count(*) into member_activity from public.gym_member_activity();

  -- Writing a set for another member must be rejected by the WITH CHECK clause.
  begin
    insert into public.workout_sets (user_id, exercise_id, week_number, set_number, weight_kg, reps)
    values (member_b, 'f0000000-0000-4000-8000-0000000000e2', 9, 1, 100, 5);
    wrote_other := true;
  exception when insufficient_privilege then
    wrote_other := false;
  end;

  -- Self-promotion to super_admin must be rejected too.
  perform set_config('request.jwt.claims',
    json_build_object('sub', member_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    update public.profiles set role = 'super_admin' where id = member_a;
    escalated := true;
  exception when insufficient_privilege then
    escalated := false;
  end;

  -------------------------------------------------------------- gym admin A --
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into admin_sets from public.workout_sets;
  select count(*) into admin_members from public.profiles where role = 'member';
  select count(*) into admin_activity from public.gym_member_activity();
  select count(*) into admin_platform from public.platform_stats();
  select count(*) into admin_gyms from public.gyms;

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  insert into _rls_results (ord, check_name, result) values
    (1,  'member sees only own sets (1)',                    pg_temp.verdict(own_sets = 1)),
    (2,  'member cannot read another member''s sets (0)',    pg_temp.verdict(other_sets = 0)),
    (3,  'member sees only own exercises (1)',               pg_temp.verdict(own_ex = 1)),
    (4,  'member sees only own profile (1)',                 pg_temp.verdict(visible_profiles = 1)),
    (5,  'member cannot write sets for another member',      pg_temp.verdict(wrote_other = false)),
    (6,  'member cannot escalate own role',                  pg_temp.verdict(escalated = false)),
    (7,  'member can read plan templates (>=3)',             pg_temp.verdict(templates >= 3)),
    (8,  'member gets no rows from gym_member_activity()',   pg_temp.verdict(member_activity = 0)),
    (9,  'gym admin sees NO raw workout sets (0)',           pg_temp.verdict(admin_sets = 0)),
    (10, 'gym admin sees only own-gym members (1)',          pg_temp.verdict(admin_members = 1)),
    (11, 'gym_member_activity() scoped to own gym (1)',      pg_temp.verdict(admin_activity = 1)),
    (12, 'gym admin gets no rows from platform_stats()',     pg_temp.verdict(admin_platform = 0)),
    (13, 'gym admin sees only own gym (1)',                  pg_temp.verdict(admin_gyms = 1));
end $$;

-- ------------------------------------------------------------------ cleanup --
delete from auth.users where id in (
  'f0000000-0000-4000-8000-00000000000a',
  'f0000000-0000-4000-8000-00000000000b',
  'f0000000-0000-4000-8000-0000000000ad'
);
delete from public.gyms where id in (
  'f0000000-0000-4000-8000-0000000000a1',
  'f0000000-0000-4000-8000-0000000000b1'
);

-- ------------------------------------------------------------------ results --
select ord, check_name, result from _rls_results order by ord;
