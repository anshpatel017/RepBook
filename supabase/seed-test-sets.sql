-- ============================================================================
-- DEV ONLY — fill the test member's plan with 3 weeks of logged sets so the
-- charts have something to draw. Run after seed-test-member.sql and after the
-- member has a plan (i.e. after plan setup, or after adding exercises).
--
-- Weights climb per week (+2.5 kg) and per set, so the comparison bars and the
-- trend line both show real progression.
--
-- Safe to re-run: it upserts on (exercise_id, week_number, set_number).
-- ============================================================================

with member as (
  select p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'member1@repbook.dev'
),
ex as (
  select e.id,
         e.user_id,
         row_number() over (order by e.day_of_week, e.position) as rn
  from public.exercises e
  join member m on m.id = e.user_id
  where e.archived_at is null
)
insert into public.workout_sets (user_id, exercise_id, week_number, set_number, weight_kg, reps, logged_at)
select ex.user_id,
       ex.id,
       w.week,
       s.set_no,
       40 + (ex.rn * 5) + ((w.week - 1) * 2.5) + ((s.set_no - 1) * 2.5),
       12 - s.set_no,
       now() - ((3 - w.week) * interval '7 days')
from ex
cross join generate_series(1, 3) as w(week)
cross join generate_series(1, 3) as s(set_no)
on conflict (exercise_id, week_number, set_number) do update
set weight_kg = excluded.weight_kg,
    reps      = excluded.reps,
    logged_at = excluded.logged_at;

-- The member is now "on" week 3, so the week chips and selectors show 1–3.
update public.profiles
set current_week = 3
where id in (
  select p.id from public.profiles p
  join auth.users u on u.id = p.id
  where u.email = 'member1@repbook.dev'
);

-- Verify: sets per week, and the heaviest lift logged.
select s.week_number,
       count(*)          as sets,
       max(s.weight_kg)  as best_kg
from public.workout_sets s
join auth.users u on u.id = s.user_id
where u.email = 'member1@repbook.dev'
group by s.week_number
order by s.week_number;
