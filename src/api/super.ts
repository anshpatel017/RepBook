import { invoke } from '@/api/admin';
import { supabase } from '@/lib/supabase';

/** One row of platform_stats() — super_admin only, gated inside the function. */
export type GymStats = {
  gymId: string;
  name: string;
  city: string | null;
  isActive: boolean;
  members: number;
  activeMembers30d: number;
};

export type PlatformTotals = { gyms: number; members: number; active30d: number };

export type GymCredentials = { gymId: string; email: string; password: string };

export async function fetchPlatformStats(): Promise<{
  gyms: GymStats[];
  totals: PlatformTotals;
}> {
  const { data, error } = await supabase.rpc('platform_stats');
  if (error) throw error;

  const gyms: GymStats[] = (data ?? [])
    .map((row) => ({
      gymId: row.gym_id,
      name: row.gym_name,
      city: row.city,
      isActive: row.is_active,
      members: Number(row.members ?? 0),
      activeMembers30d: Number(row.active_members_30d ?? 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totals = gyms.reduce<PlatformTotals>(
    (sum, gym) => ({
      gyms: sum.gyms + 1,
      members: sum.members + gym.members,
      active30d: sum.active30d + gym.activeMembers30d,
    }),
    { gyms: 0, members: 0, active30d: 0 },
  );

  return { gyms, totals };
}

export async function createGym(input: {
  name: string;
  city: string | null;
  ownerName: string;
  ownerEmail: string;
}): Promise<GymCredentials> {
  return invoke<GymCredentials>('create-gym', { ...input });
}

/** New temporary password for a gym admin who lost theirs. Shown once. */
export async function resetAdminPassword(
  adminId: string,
): Promise<{ email: string; password: string }> {
  return invoke<{ email: string; password: string }>('reset-admin-password', { adminId });
}

export async function setGymActive(
  gymId: string,
  active: boolean,
): Promise<{ active: boolean; affected: number }> {
  return invoke<{ active: boolean; affected: number }>('set-gym-active', { gymId, active });
}

/**
 * A gym's admins, for the "admin contact" line on the gym sheet.
 * Only name/phone: profiles has no email column — auth emails stay in auth.users,
 * which the app can't read (and shouldn't).
 */
export async function fetchGymAdmins(
  gymId: string,
): Promise<{ id: string; display_name: string | null; phone: string | null }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, phone')
    .eq('gym_id', gymId)
    .eq('role', 'gym_admin');
  if (error) throw error;
  return data;
}
