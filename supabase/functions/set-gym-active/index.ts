import { adminClient, identifyCaller } from '../_shared/caller.ts';
import { json, preflight } from '../_shared/http.ts';

const FOREVER = '876000h';

/**
 * set-gym-active — super_admin suspends or restores a whole gym (US-21).
 *
 * In: { gymId, active: boolean }
 * Out: { active, affected }
 *
 * Not in the original four functions, but US-21 requires that deactivating a gym
 * disables *all* its logins, and flipping gyms.is_active alone wouldn't stop
 * anyone signing in. Bans are an Admin API operation, so per architecture §2
 * they belong in an Edge Function.
 *
 * Reactivating only unbans accounts whose profile is still active, so a member
 * their gym had individually deactivated stays deactivated.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'super_admin') return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const gymId = body?.gymId;
    const active = body?.active;

    if (typeof gymId !== 'string' || gymId.length === 0) {
      return json({ error: 'invalid_gym', message: 'gymId is required.' }, 400);
    }
    if (typeof active !== 'boolean') {
      return json({ error: 'invalid_active', message: 'active must be true or false.' }, 400);
    }

    const admin = adminClient();

    const { data: gym, error: gymError } = await admin
      .from('gyms')
      .update({ is_active: active })
      .eq('id', gymId)
      .select('id')
      .maybeSingle();
    if (gymError) return json({ error: 'gym_failed', message: gymError.message }, 400);
    if (!gym) return json({ error: 'not_found', message: 'Gym not found.' }, 404);

    const { data: people, error: peopleError } = await admin
      .from('profiles')
      .select('id, is_active')
      .eq('gym_id', gymId);
    if (peopleError) return json({ error: 'members_failed', message: peopleError.message }, 500);

    let affected = 0;
    for (const person of people ?? []) {
      // Restoring must not resurrect someone the gym deactivated on purpose.
      if (active && person.is_active !== true) continue;
      const { error } = await admin.auth.admin.updateUserById(person.id, {
        ban_duration: active ? 'none' : FOREVER,
      });
      if (!error) affected += 1;
    }

    return json({ active, affected });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
