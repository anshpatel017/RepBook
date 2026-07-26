import { adminClient, findOwnGymMember, identifyCaller } from '../_shared/caller.ts';
import { generatePassword, json, preflight } from '../_shared/http.ts';

/**
 * reset-member-password — gym_admin issues a new temporary password (US-16).
 *
 * In: { memberId }
 * Out: { password }  ← shown once; the member must set their own on next login.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'gym_admin' || !caller.gymId) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const admin = adminClient();

    // Tenant check BEFORE any write: another gym's member is simply not found.
    const member = await findOwnGymMember(admin, caller, body?.memberId);
    if (!member) return json({ error: 'not_found', message: 'Member not found.' }, 404);

    const password = generatePassword(8);
    const { error: authError } = await admin.auth.admin.updateUserById(member.id, { password });
    if (authError) return json({ error: 'reset_failed', message: authError.message }, 400);

    const { error: profileError } = await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', member.id);
    if (profileError) return json({ error: 'profile_failed', message: profileError.message }, 500);

    return json({ password });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
