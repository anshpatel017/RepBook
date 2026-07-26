import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createGym,
  fetchGymAdmins,
  fetchPlatformStats,
  resetAdminPassword,
  setGymActive,
} from '@/api/super';

export const platformKey = ['platformStats'] as const;

/** Platform totals + per-gym rows (wireframe screen 9). */
export function usePlatformStats() {
  return useQuery({ queryKey: platformKey, queryFn: fetchPlatformStats });
}

export function useCreateGym() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGym,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKey }),
  });
}

export function useSetGymActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gymId: string; active: boolean }) =>
      setGymActive(input.gymId, input.active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKey }),
  });
}

export function useResetAdminPassword() {
  return useMutation({ mutationFn: (adminId: string) => resetAdminPassword(adminId) });
}

export function useGymAdmins(gymId: string | undefined) {
  return useQuery({
    queryKey: ['gymAdmins', gymId],
    queryFn: () => fetchGymAdmins(gymId as string),
    enabled: Boolean(gymId),
  });
}
