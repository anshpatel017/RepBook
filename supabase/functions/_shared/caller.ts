import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export type Role = 'super_admin' | 'gym_admin' | 'member';

export type Caller = { id: string; role: Role; gymId: string | null };

/**
 * Who is calling, according to the server.
 *
 * The role is re-read from `profiles` using the caller's own JWT on every
 * request — a client claiming to be an admin proves nothing (CLAUDE.md rule 3).
 * Deactivated accounts are rejected here too.
 */
export async function identifyCaller(req: Request): Promise<Caller | null> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return null;

  const asCaller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
  } = await asCaller.auth.getUser();
  if (!user) return null;

  const { data: profile } = await asCaller
    .from('profiles')
    .select('role, gym_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) return null;

  return { id: user.id, role: profile.role as Role, gymId: profile.gym_id };
}

/** Service-role client. Bypasses RLS, so it exists ONLY inside functions. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

/**
 * A member the caller is actually allowed to touch: same gym, role member.
 * Returns null when the id belongs to another tenant — the caller must not be
 * able to tell "not yours" from "doesn't exist".
 */
export async function findOwnGymMember(
  admin: SupabaseClient,
  caller: Caller,
  memberId: unknown,
): Promise<{ id: string; display_name: string | null } | null> {
  if (typeof memberId !== 'string' || memberId.length === 0) return null;
  if (caller.role !== 'gym_admin' || !caller.gymId) return null;

  const { data } = await admin
    .from('profiles')
    .select('id, display_name, role, gym_id')
    .eq('id', memberId)
    .maybeSingle();

  if (!data || data.role !== 'member' || data.gym_id !== caller.gymId) return null;
  return { id: data.id, display_name: data.display_name };
}

/** A gym_admin of a deactivated gym must not be able to provision anything. */
export async function isGymActive(admin: SupabaseClient, gymId: string): Promise<boolean> {
  const { data } = await admin.from('gyms').select('is_active').eq('id', gymId).maybeSingle();
  return data?.is_active === true;
}
