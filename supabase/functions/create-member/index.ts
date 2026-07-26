import { adminClient, identifyCaller, isGymActive } from '../_shared/caller.ts';
import { cleanName, generatePassword, isE164, json, preflight } from '../_shared/http.ts';

/**
 * create-member — gym_admin provisions one of their own members.
 *
 * In: { phone: "+919876543210", name: "Rahul S." }
 * Out: { phone, password }  ← shown to the admin exactly once, never stored.
 *
 * phone_confirm: true means no OTP and no SMS cost (FR-4).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const caller = await identifyCaller(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (caller.role !== 'gym_admin' || !caller.gymId) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => null);
    const phone = body?.phone;
    const name = cleanName(body?.name);

    if (!isE164(phone)) {
      return json({ error: 'invalid_phone', message: 'Phone must be E.164, e.g. +919876543210.' }, 400);
    }
    if (!name) {
      return json({ error: 'invalid_name', message: 'Enter the member’s name.' }, 400);
    }

    const admin = adminClient();

    if (!(await isGymActive(admin, caller.gymId))) {
      return json({ error: 'gym_inactive', message: 'This gym is deactivated.' }, 403);
    }

    // Duplicate check before touching auth, so the common case gets the good message.
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (existing) {
      return json({ error: 'phone_taken', message: 'This number already has an account.' }, 409);
    }

    const password = generatePassword(8);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: { name },
    });

    if (createError || !created.user) {
      const message = createError?.message ?? 'Could not create the account.';
      const taken = /already|registered|exists/i.test(message);
      return json(
        {
          error: taken ? 'phone_taken' : 'create_failed',
          message: taken ? 'This number already has an account.' : message,
        },
        taken ? 409 : 400,
      );
    }

    // The signup trigger already inserted the profile row; attach it to this gym.
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        role: 'member',
        gym_id: caller.gymId,
        display_name: name,
        phone,
        must_change_password: true,
        onboarded: false,
        is_active: true,
      })
      .eq('id', created.user.id);

    if (profileError) {
      // Don't leave an auth user that no gym owns.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: 'profile_failed', message: profileError.message }, 500);
    }

    return json({ phone, password });
  } catch (error) {
    return json({ error: 'unexpected', message: String(error) }, 500);
  }
});
