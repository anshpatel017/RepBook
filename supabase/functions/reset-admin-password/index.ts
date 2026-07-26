import { adminClient, identifyCaller } from '../_shared/caller.ts';
import { generatePassword, json, preflight } from '../_shared/http.ts';

/**
 * reset-admin-password — super_admin issues a new temporary password for a
 * gym_admin who lost theirs. The mirror of reset-member-password one level up:
 * gym admins reset their members, the platform owner resets gym admins.
 *
 * In: { adminId }
 * Out: { email, password }  ← shown once. The email comes back because the app
 * cannot read auth.users, and a password is useless without knowing the login
 * it belongs to.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'super_admin') return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const adminId = body?.adminId;
    if (typeof adminId !== 'string' || adminId.length === 0) {
      return json({ error: 'invalid_admin', message: 'adminId is required.' }, 400);
    }

    const admin = adminClient();

    // Only gym admins: members are their own gym's responsibility, and a
    // super_admin must not be resettable through this path.
    const { data: target } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', adminId)
      .maybeSingle();
    if (!target || target.role !== 'gym_admin') {
      return json({ error: 'not_found', message: 'Gym admin not found.' }, 404);
    }

    const password = generatePassword(10);
    const { data: updated, error: authError } = await admin.auth.admin.updateUserById(adminId, {
      password,
    });
    if (authError) return json({ error: 'reset_failed', message: authError.message }, 400);

    const { error: profileError } = await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', adminId);
    if (profileError) return json({ error: 'profile_failed', message: profileError.message }, 500);

    return json({ email: updated.user?.email ?? '', password });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
