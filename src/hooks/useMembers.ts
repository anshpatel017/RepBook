import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  createMember,
  fetchMemberActivity,
  resetMemberPassword,
  setMemberActive,
  type MemberActivity,
} from '@/api/admin';

export const membersKey = ['members'] as const;

/** Members of the caller's gym, with activity aggregates and search. */
export function useMembers(search: string) {
  const query = useQuery({ queryKey: membersKey, queryFn: fetchMemberActivity });

  const members = useMemo(() => {
    const rows = [...(query.data ?? [])].sort((a, b) =>
      (a.display_name ?? '').localeCompare(b.display_name ?? ''),
    );
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    const digits = needle.replace(/\D/g, '');
    return rows.filter((member) => {
      const nameHit = (member.display_name ?? '').toLowerCase().includes(needle);
      const phoneHit = digits.length > 0 && (member.phone ?? '').includes(digits);
      return nameHit || phoneHit;
    });
  }, [query.data, search]);

  const counts = useMemo(() => {
    const all = query.data ?? [];
    return { total: all.length, active: all.filter((member) => member.is_active).length };
  }, [query.data]);

  return { ...query, members, counts };
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; phone: string }) => createMember(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useResetMemberPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => resetMemberPassword(memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useSetMemberActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; active: boolean }) =>
      setMemberActive(input.memberId, input.active),
    // Reflect the new badge immediately, then confirm from the server.
    onMutate: async ({ memberId, active }) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      const previous = queryClient.getQueryData<MemberActivity[]>(membersKey);
      queryClient.setQueryData<MemberActivity[]>(membersKey, (rows) =>
        (rows ?? []).map((row) => (row.id === memberId ? { ...row, is_active: active } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(membersKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: membersKey }),
  });
}

/** Days since the member's last logged set; null when they never logged one. */
export function daysSince(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const then = new Date(timestamp).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

/** "2d ago" / "21d ago" / "Never" — the wireframe's last-workout line. */
export function lastWorkoutLabel(timestamp: string | null): string {
  const days = daysSince(timestamp);
  if (days === null) return 'Never logged a workout';
  if (days === 0) return 'Last workout: today';
  if (days === 1) return 'Last workout: yesterday';
  return `Last workout: ${days}d ago`;
}
