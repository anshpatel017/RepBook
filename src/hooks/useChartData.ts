import { useQuery } from '@tanstack/react-query';

import { fetchComparison, fetchTrend } from '@/api/charts';
import type { DayOfWeek } from '@/lib/days';

export function useComparison(
  userId: string | undefined,
  day: DayOfWeek,
  weekA: number,
  weekB: number,
) {
  return useQuery({
    queryKey: ['charts', 'comparison', userId, day, weekA, weekB],
    queryFn: () => fetchComparison(userId as string, day, weekA, weekB),
    enabled: Boolean(userId),
  });
}

export function useTrend(exerciseId: string | undefined) {
  return useQuery({
    queryKey: ['charts', 'trend', exerciseId],
    queryFn: () => fetchTrend(exerciseId as string),
    enabled: Boolean(exerciseId),
  });
}

