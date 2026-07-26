import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  addExercise,
  archiveExercise,
  createPlan,
  fetchPlan,
  fetchTemplates,
  renameExercise,
  type Exercise,
} from '@/api/plan';
import { fetchMemberStats } from '@/api/sets';
import { DAYS, type DayOfWeek } from '@/lib/days';

export const planKey = (userId: string | undefined) => ['plan', userId] as const;
export const statsKey = (userId: string | undefined) => ['memberStats', userId] as const;

/** The member's plan, plus a per-day index for the home grid. */
export function usePlan(userId: string | undefined) {
  const query = useQuery({
    queryKey: planKey(userId),
    queryFn: () => fetchPlan(userId as string),
    enabled: Boolean(userId),
  });

  const byDay = useMemo(() => {
    const map = new Map<DayOfWeek, Exercise[]>();
    for (const { value } of DAYS) map.set(value, []);
    for (const exercise of query.data ?? []) {
      const list = map.get(exercise.day_of_week as DayOfWeek);
      if (list) list.push(exercise);
    }
    return map;
  }, [query.data]);

  return { ...query, byDay };
}

export function useTemplates() {
  return useQuery({
    queryKey: ['planTemplates'],
    queryFn: fetchTemplates,
    staleTime: 24 * 60 * 60_000, // seeded data, effectively static
  });
}

export function useMemberStats(userId: string | undefined) {
  return useQuery({
    queryKey: statsKey(userId),
    queryFn: () => fetchMemberStats(userId as string),
    enabled: Boolean(userId),
  });
}

/** First-run plan creation (plan setup screen). */
export function useCreatePlan(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: { day: DayOfWeek; names: string[] }[]) =>
      createPlan(userId as string, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKey(userId) }),
  });
}

export function useAddExercise(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { day: DayOfWeek; name: string; position: number }) =>
      addExercise(userId as string, input.day, input.name, input.position),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ['dayLog'] });
    },
  });
}

export function useRenameExercise(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exerciseId: string; name: string }) =>
      renameExercise(input.exerciseId, input.name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ['dayLog'] });
      void queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });
}

/** Soft archive — history is preserved. */
export function useArchiveExercise(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: string) => archiveExercise(exerciseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ['dayLog'] });
      void queryClient.invalidateQueries({ queryKey: ['charts'] });
    },
  });
}
