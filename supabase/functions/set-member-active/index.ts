import { adminClient, findOwnGymMember, identifyCaller } from '../_shared/caller.ts';
import { json, preflight } from '../_shared/http.ts';

/** ~100 years — Supabase's way of saying "banned until someone lifts it". */
const FOREVER = '876000h';

/**
 * set-member-active — gym_admin deactivates or reactivates a member (US-17).
 *
 * In: { memberId, active: boolean }
 * Out: { active }
 *
 * Deactivation bans the auth user, so login stops immediately, and flips
 * profiles.is_active so the app can explain why.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'gym_admin' || !caller.gymId) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const active = body?.active;
    if (typeof active !== 'boolean') {
      return json({ error: 'invalid_active', message: 'active must be true or false.' }, 400);
    }

    const admin = adminClient();
    const member = await findOwnGymMember(admin, caller, body?.memberId);
    if (!member) return json({ error: 'not_found', message: 'Member not found.' }, 404);

    const { error: authError } = await admin.auth.admin.updateUserById(member.id, {
      ban_duration: active ? 'none' : FOREVER,
    });
    if (authError) return json({ error: 'ban_failed', message: authError.message }, 400);

    const { error: profileError } = await admin
      .from('profiles')
      .update({ is_active: active })
      .eq('id', member.id);
    if (profileError) return json({ error: 'profile_failed', message: profileError.message }, 500);

    return json({ active });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
