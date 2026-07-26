import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearMustChangePassword,
  fetchGymName,
  fetchProfile,
  updateProfile,
  type Profile,
  type ProfilePatch,
} from '@/api/profile';

export const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** Role, tenancy and flags for the signed-in user. Drives all routing. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => updateProfile(userId as string, patch),
    onSuccess: (profile) => queryClient.setQueryData<Profile>(profileKey(userId), profile),
  });
}

/** Clears the blocking must_change_password flag after the user sets their own. */
export function useClearMustChangePassword(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearMustChangePassword(userId as string),
    onSuccess: (profile) => queryClient.setQueryData<Profile>(profileKey(userId), profile),
  });
}

/** "Managed by <gym>" — null for super_admin, who belongs to no gym. */
export function useGymName(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ['gymName', gymId],
    queryFn: () => fetchGymName(gymId as string),
    enabled: Boolean(gymId),
    staleTime: 5 * 60_000,
  });
}
