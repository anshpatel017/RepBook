import type { DayOfWeek } from '@/lib/days';
import { supabase } from '@/lib/supabase';

export type LoggedSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
};

/** One exercise on the log screen, with the sets logged for that week. */
export type DayLogEntry = {
  id: string;
  name: string;
  position: number;
  sets: LoggedSet[];
};

/**
 * What was lifted before this week, for the ghost values and PR chip (FR-18).
 * `lastWeek` is keyed `exerciseId:setNumber`; `bestBefore` is the heaviest set
 * of each exercise in any earlier week.
 */
export type DayHistory = {
  lastWeek: Record<string, { weightKg: number | null; reps: number | null }>;
  bestBefore: Record<string, number>;
};

export type MemberStats = {
  weeksLogged: number;
  totalSets: number;
  bestKg: number | null;
};

/**
 * Plan + logs for one day/week (architecture §3 "Key queries").
 *
 * Two parallel reads instead of an embedded join: both hit covering indexes,
 * and keeping the shapes flat makes the optimistic cache patching in
 * useDayLog straightforward.
 */
export async function fetchDayLog(
  userId: string,
  day: DayOfWeek,
  week: number,
): Promise<DayLogEntry[]> {
  const [exercises, sets] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, name, position')
      .eq('user_id', userId)
      .eq('day_of_week', day)
      .is('archived_at', null)
      .order('position', { ascending: true }),
    supabase
      .from('workout_sets')
      .select('id, exercise_id, set_number, weight_kg, reps')
      .eq('user_id', userId)
      .eq('week_number', week),
  ]);

  if (exercises.error) throw exercises.error;
  if (sets.error) throw sets.error;

  const byExercise = new Map<string, LoggedSet[]>();
  for (const set of sets.data) {
    const list = byExercise.get(set.exercise_id);
    if (list) list.push(set);
    else byExercise.set(set.exercise_id, [set]);
  }

  return exercises.data.map((exercise) => ({
    ...exercise,
    sets: (byExercise.get(exercise.id) ?? []).sort((a, b) => a.set_number - b.set_number),
  }));
}

export type SetInput = {
  userId: string;
  exerciseId: string;
  week: number;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
};

/** Auto-save target: unique (exercise_id, week_number, set_number). */
export async function upsertSet(input: SetInput): Promise<LoggedSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .upsert(
      {
        user_id: input.userId,
        exercise_id: input.exerciseId,
        week_number: input.week,
        set_number: input.setNumber,
        weight_kg: input.weightKg,
        reps: input.reps,
        logged_at: new Date().toISOString(),
      },
      { onConflict: 'exercise_id,week_number,set_number' },
    )
    .select('id, exercise_id, set_number, weight_kg, reps')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSet(setId: string): Promise<void> {
  const { error } = await supabase.from('workout_sets').delete().eq('id', setId);
  if (error) throw error;
}

/** Weeks that already have logged sets for a day — the ✓ on the week chips. */
export async function fetchLoggedWeeks(exerciseIds: string[]): Promise<number[]> {
  if (exerciseIds.length === 0) return [];

  const { data, error } = await supabase
    .from('workout_sets')
    .select('week_number')
    .in('exercise_id', exerciseIds);
  if (error) throw error;

  return [...new Set(data.map((row) => row.week_number))].sort((a, b) => a - b);
}

/**
 * Home stat cards: weeks logged / total sets / best lift.
 * Aggregated client-side over two slim columns — a member's whole history is a
 * few thousand rows at most, and PostgREST aggregate support varies by project.
 */
export async function fetchMemberStats(userId: string): Promise<MemberStats> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('week_number, weight_kg')
    .eq('user_id', userId);
  if (error) throw error;

  const weeks = new Set<number>();
  let bestKg: number | null = null;
  for (const row of data) {
    weeks.add(row.week_number);
    if (row.weight_kg !== null && (bestKg === null || row.weight_kg > bestKg)) {
      bestKg = row.weight_kg;
    }
  }

  return { weeksLogged: weeks.size, totalSets: data.length, bestKg };
}

/**
 * History for one day, up to (but excluding) the given week. Fetched separately
 * from fetchDayLog so the log screen paints as soon as this week's sets arrive —
 * ghosts and PR chips fill in a moment later.
 */
export async function fetchDayHistory(
  exerciseIds: string[],
  week: number,
): Promise<DayHistory> {
  if (exerciseIds.length === 0 || week <= 1) return { lastWeek: {}, bestBefore: {} };

  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, week_number, set_number, weight_kg, reps')
    .in('exercise_id', exerciseIds)
    .lt('week_number', week);
  if (error) throw error;

  const lastWeek: DayHistory['lastWeek'] = {};
  const bestBefore: DayHistory['bestBefore'] = {};

  for (const row of data) {
    if (row.week_number === week - 1) {
      lastWeek[`${row.exercise_id}:${row.set_number}`] = {
        weightKg: row.weight_kg,
        reps: row.reps,
      };
    }
    if (row.weight_kg !== null) {
      const best = bestBefore[row.exercise_id];
      if (best === undefined || row.weight_kg > best) bestBefore[row.exercise_id] = row.weight_kg;
    }
  }

  return { lastWeek, bestBefore };
}
