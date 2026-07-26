import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import {
  deleteSet,
  fetchDayHistory,
  fetchDayLog,
  fetchLoggedWeeks,
  upsertSet,
  type DayLogEntry,
  type LoggedSet,
} from '@/api/sets';
import { statsKey } from '@/hooks/usePlan';
import type { DayOfWeek } from '@/lib/days';

export const dayLogKey = (userId: string | undefined, day: DayOfWeek, week: number) =>
  ['dayLog', userId, day, week] as const;

const MAX_SETS = 20; // schema check: set_number between 1 and 20

/** Plan + logged sets for one day/week, with auto-saving set mutations. */
export function useDayLog(userId: string | undefined, day: DayOfWeek, week: number) {
  const queryClient = useQueryClient();
  const queryKey = dayLogKey(userId, day, week);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchDayLog(userId as string, day, week),
    enabled: Boolean(userId),
  });

  const invalidateDerived = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: statsKey(userId) });
    void queryClient.invalidateQueries({ queryKey: ['loggedWeeks'] });
    void queryClient.invalidateQueries({ queryKey: ['charts'] });
  }, [queryClient, userId]);

  /**
   * Auto-save (CLAUDE.md rule 10): the row's local state is authoritative while
   * typing, this writes it through on a debounce with an optimistic patch and a
   * rollback if the server rejects it.
   */
  const save = useMutation({
    mutationFn: (input: {
      exerciseId: string;
      setNumber: number;
      weightKg: number | null;
      reps: number | null;
    }) => upsertSet({ userId: userId as string, week, ...input }),

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DayLogEntry[]>(queryKey);

      queryClient.setQueryData<DayLogEntry[]>(queryKey, (entries) =>
        (entries ?? []).map((entry) => {
          if (entry.id !== input.exerciseId) return entry;
          const existing = entry.sets.find((set) => set.set_number === input.setNumber);
          const patched: LoggedSet = existing
            ? { ...existing, weight_kg: input.weightKg, reps: input.reps }
            : {
                id: `optimistic-${input.exerciseId}-${input.setNumber}`,
                exercise_id: input.exerciseId,
                set_number: input.setNumber,
                weight_kg: input.weightKg,
                reps: input.reps,
              };
          const sets = existing
            ? entry.sets.map((set) => (set.set_number === input.setNumber ? patched : set))
            : [...entry.sets, patched];
          return { ...entry, sets: sets.sort((a, b) => a.set_number - b.set_number) };
        }),
      );

      return { previous };
    },

    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSuccess: (saved) => {
      // Replace the optimistic row with the real one (real id, server values).
      queryClient.setQueryData<DayLogEntry[]>(queryKey, (entries) =>
        (entries ?? []).map((entry) =>
          entry.id === saved.exercise_id
            ? {
                ...entry,
                sets: entry.sets.map((set) =>
                  set.set_number === saved.set_number ? saved : set,
                ),
              }
            : entry,
        ),
      );
      invalidateDerived();
    },
  });

  const removeSet = useMutation({
    mutationFn: (input: { exerciseId: string; setId: string }) => deleteSet(input.setId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<DayLogEntry[]>(queryKey);
      queryClient.setQueryData<DayLogEntry[]>(queryKey, (entries) =>
        (entries ?? []).map((entry) =>
          entry.id === input.exerciseId
            ? { ...entry, sets: entry.sets.filter((set) => set.id !== input.setId) }
            : entry,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: invalidateDerived,
  });

  return { ...query, save, removeSet };
}

/**
 * Next set number for an exercise: the smallest unused slot, so repeated
 * add/remove cycles never run past the 20-set ceiling.
 */
export function nextSetNumber(sets: readonly LoggedSet[]): number | null {
  const used = new Set(sets.map((set) => set.set_number));
  for (let candidate = 1; candidate <= MAX_SETS; candidate += 1) {
    if (!used.has(candidate)) return candidate;
  }
  return null;
}

/** Week numbers with logged data for a day — drives the ✓ on week chips. */
export function useLoggedWeeks(day: DayOfWeek, exerciseIds: string[]) {
  return useQuery({
    queryKey: ['loggedWeeks', day, [...exerciseIds].sort().join(',')],
    queryFn: () => fetchLoggedWeeks(exerciseIds),
    enabled: exerciseIds.length > 0,
  });
}

/**
 * Last week's numbers + the pre-week best per exercise, for the ghost values and
 * PR chips (FR-18). Kept out of useDayLog so the inputs render immediately.
 */
export function useDayHistory(day: DayOfWeek, week: number, exerciseIds: string[]) {
  const key = [...exerciseIds].sort().join(',');
  return useQuery({
    queryKey: ['dayHistory', day, week, key],
    queryFn: () => fetchDayHistory(exerciseIds, week),
    enabled: exerciseIds.length > 0 && week > 1,
    staleTime: 60_000,
  });
}
