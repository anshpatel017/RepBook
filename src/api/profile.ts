import type { Unit } from '@/lib/units';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/db';

export type Role = 'super_admin' | 'gym_admin' | 'member';

type ProfileRow = Tables<'profiles'>;

/** The profile as the app uses it: role and unit narrowed to real unions. */
export type Profile = Omit<ProfileRow, 'role' | 'unit'> & { role: Role; unit: Unit };

const ROLES: readonly Role[] = ['super_admin', 'gym_admin', 'member'];

function toProfile(row: ProfileRow): Profile {
  const role = ROLES.includes(row.role as Role) ? (row.role as Role) : 'member';
  const unit: Unit = row.unit === 'lb' ? 'lb' : 'kg';
  return { ...row, role, unit };
}

/** Own profile (RLS: "read own profile"). null when the row is missing. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

/**
 * Update own profile. RLS forbids changing role or gym_id, so those are not
 * accepted here — admin-side changes go through Edge Functions.
 */
export type ProfilePatch = Omit<TablesUpdate<'profiles'>, 'id' | 'role' | 'gym_id' | 'created_at'>;

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return toProfile(data);
}

/** Called right after the forced first-login password change. */
export async function clearMustChangePassword(userId: string): Promise<Profile> {
  return updateProfile(userId, { must_change_password: false });
}

/** Name of the gym a member/admin belongs to — for "Managed by <gym>". */
export async function fetchGymName(gymId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('gyms')
    .select('name')
    .eq('id', gymId)
    .maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}
