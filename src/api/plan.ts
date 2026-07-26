import type { DayOfWeek } from '@/lib/days';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/db';

export type Exercise = Tables<'exercises'>;

export type PlanTemplate = {
  id: string;
  name: string;
  exercises: { day_of_week: number; name: string; position: number }[];
};

/** The member's live plan: every non-archived exercise, ordered day → position. */
export async function fetchPlan(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('day_of_week', { ascending: true })
    .order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addExercise(
  userId: string,
  dayOfWeek: DayOfWeek,
  name: string,
  position: number,
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({ user_id: userId, day_of_week: dayOfWeek, name: name.trim(), position })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Renaming keeps history: the row (and every set pointing at it) survives. */
export async function renameExercise(exerciseId: string, name: string): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .update({ name: name.trim() })
    .eq('id', exerciseId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Delete = soft archive, so logged sets stay intact for charts. */
export async function archiveExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('exercises')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', exerciseId);
  if (error) throw error;
}

/** One insert for the whole first-run plan. */
export async function createPlan(
  userId: string,
  plan: { day: DayOfWeek; names: string[] }[],
): Promise<void> {
  const rows = plan.flatMap(({ day, names }) =>
    names.map((name, index) => ({
      user_id: userId,
      day_of_week: day,
      name: name.trim(),
      position: index,
    })),
  );
  if (rows.length === 0) return;

  const { error } = await supabase.from('exercises').insert(rows);
  if (error) throw error;
}

export async function fetchTemplates(): Promise<PlanTemplate[]> {
  const { data, error } = await supabase
    .from('plan_templates')
    .select('id, name, template_exercises(day_of_week, name, position)')
    .order('name', { ascending: true });
  if (error) throw error;

  return data.map((template) => ({
    id: template.id,
    name: template.name,
    exercises: [...template.template_exercises].sort(
      (a, b) => a.day_of_week - b.day_of_week || a.position - b.position,
    ),
  }));
}
