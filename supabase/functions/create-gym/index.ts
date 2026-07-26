import { adminClient, identifyCaller } from '../_shared/caller.ts';
import { cleanName, generatePassword, isEmail, json, preflight } from '../_shared/http.ts';

/**
 * create-gym — super_admin onboards a gym and its first admin (US-20).
 *
 * In: { name, city, ownerName, ownerEmail }
 * Out: { gymId, email, password }  ← shown once, handed to the gym owner.
 *
 * email_confirm: true means no confirmation email is ever sent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'super_admin') return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const name = cleanName(body?.name);
    const ownerName = cleanName(body?.ownerName);
    const city = body?.city === undefined || body?.city === null ? null : cleanName(body.city);
    const ownerEmail = typeof body?.ownerEmail === 'string' ? body.ownerEmail.trim().toLowerCase() : null;

    if (!name) return json({ error: 'invalid_name', message: 'Enter the gym name.' }, 400);
    if (!ownerName) return json({ error: 'invalid_owner', message: 'Enter the owner’s name.' }, 400);
    if (!isEmail(ownerEmail)) {
      return json({ error: 'invalid_email', message: 'Enter a valid owner email.' }, 400);
    }

    const admin = adminClient();

    const { data: gym, error: gymError } = await admin
      .from('gyms')
      .insert({ name, city })
      .select('id')
      .single();
    if (gymError || !gym) {
      return json({ error: 'gym_failed', message: gymError?.message ?? 'Could not create the gym.' }, 400);
    }

    const password = generatePassword(10);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true,
      user_metadata: { name: ownerName },
    });

    if (createError || !created.user) {
      // Roll the gym back so a failed onboarding leaves nothing behind.
      await admin.from('gyms').delete().eq('id', gym.id);
      const message = createError?.message ?? 'Could not create the owner account.';
      const taken = /already|registered|exists/i.test(message);
      return json(
        {
          error: taken ? 'email_taken' : 'owner_failed',
          message: taken ? 'That email already has an account.' : message,
        },
        taken ? 409 : 400,
      );
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        role: 'gym_admin',
        gym_id: gym.id,
        display_name: ownerName,
        must_change_password: true,
        onboarded: true, // admins never see the member plan-setup flow
        is_active: true,
      })
      .eq('id', created.user.id);

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      await admin.from('gyms').delete().eq('id', gym.id);
      return json({ error: 'profile_failed', message: profileError.message }, 500);
    }

    return json({ gymId: gym.id, email: ownerEmail, password });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
