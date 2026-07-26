import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** One row of gym_member_activity() — aggregates only, never raw logs. */
export type MemberActivity = {
  id: string;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  last_workout_at: string | null;
  weeks_logged: number;
};

/** Credentials returned by a provisioning function. Displayed once, never stored. */
export type MemberCredentials = { phone: string; password: string };

/**
 * Gym admin's member list. The security-definer function is the ONLY way admins
 * read member data — RLS gives them no access to exercises or workout_sets.
 */
export async function fetchMemberActivity(): Promise<MemberActivity[]> {
  const { data, error } = await supabase.rpc('gym_member_activity');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    phone: row.phone,
    is_active: row.is_active,
    last_workout_at: row.last_workout_at,
    weeks_logged: Number(row.weeks_logged ?? 0),
  }));
}

export async function createMember(input: {
  name: string;
  phone: string;
}): Promise<MemberCredentials> {
  return invoke<MemberCredentials>('create-member', input);
}

export async function resetMemberPassword(memberId: string): Promise<{ password: string }> {
  return invoke<{ password: string }>('reset-member-password', { memberId });
}

export async function setMemberActive(
  memberId: string,
  active: boolean,
): Promise<{ active: boolean }> {
  return invoke<{ active: boolean }>('set-member-active', { memberId, active });
}

/**
 * Edge Function call with the function's own error message surfaced.
 * supabase-js throws a generic "non-2xx status code", so the JSON body — which
 * carries the useful text like "This number already has an account." — has to be
 * read off the response explicitly.
 */
export async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      const message = details?.message ?? details?.error;
      throw new Error(typeof message === 'string' ? message : error.message);
    }
    throw error;
  }
  if (data === null) throw new Error('Empty response from the server.');
  return data;
}
