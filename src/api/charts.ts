import type { DayOfWeek } from '@/lib/days';
import { supabase } from '@/lib/supabase';

/** Best (heaviest) set of an exercise in each of the two compared weeks. */
export type ComparisonRow = {
  exerciseId: string;
  name: string;
  weekA: number | null;
  weekB: number | null;
};

export type TrendPoint = { week: number; bestKg: number };

/**
 * "Best set per exercise" for two weeks of one day (FR-12).
 * max(weight_kg) grouped by exercise + week, computed over the two weeks' rows.
 */
export async function fetchComparison(
  userId: string,
  day: DayOfWeek,
  weekA: number,
  weekB: number,
): Promise<ComparisonRow[]> {
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, position')
    .eq('user_id', userId)
    .eq('day_of_week', day)
    .is('archived_at', null)
    .order('position', { ascending: true });
  if (exercisesError) throw exercisesError;
  if (exercises.length === 0) return [];

  const { data: sets, error: setsError } = await supabase
    .from('workout_sets')
    .select('exercise_id, week_number, weight_kg')
    .in(
      'exercise_id',
      exercises.map((exercise) => exercise.id),
    )
    .in('week_number', [weekA, weekB]);
  if (setsError) throw setsError;

  const best = new Map<string, number>(); // `${exerciseId}:${week}` → max kg
  for (const set of sets) {
    if (set.weight_kg === null) continue;
    const key = `${set.exercise_id}:${set.week_number}`;
    const current = best.get(key);
    if (current === undefined || set.weight_kg > current) best.set(key, set.weight_kg);
  }

  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    name: exercise.name,
    weekA: best.get(`${exercise.id}:${weekA}`) ?? null,
    weekB: best.get(`${exercise.id}:${weekB}`) ?? null,
  }));
}

/** One exercise's best set across every logged week (FR-12, trend chart). */
export async function fetchTrend(exerciseId: string): Promise<TrendPoint[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('week_number, weight_kg')
    .eq('exercise_id', exerciseId)
    .order('week_number', { ascending: true });
  if (error) throw error;

  const best = new Map<number, number>();
  for (const row of data) {
    if (row.weight_kg === null) continue;
    const current = best.get(row.week_number);
    if (current === undefined || row.weight_kg > current) best.set(row.week_number, row.weight_kg);
  }

  return [...best.entries()]
    .map(([week, bestKg]) => ({ week, bestKg }))
    .sort((a, b) => a.week - b.week);
}
