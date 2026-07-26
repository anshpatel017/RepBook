import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type { Session };

/** Wireframe copy — the only auth error strings the UI shows. */
export const AUTH_MESSAGES = {
  wrongPhone: 'Phone or password incorrect.',
  wrongEmail: 'Email or password incorrect.',
  inactive: 'Your account is inactive. Contact your gym.',
  offline: 'No internet connection. Check your network and try again.',
  phoneDisabled: 'Phone sign-in is turned off on the server. Enable the Phone provider in Supabase.',
  emailDisabled: 'Email sign-in is turned off on the server. Enable the Email provider in Supabase.',
  tooMany: 'Too many attempts. Wait a minute and try again.',
  generic: 'Something went wrong. Please try again.',
} as const;

export async function signInWithPhone(phoneE164: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ phone: phoneE164, password });
  if (error) throw error;
  return data.session;
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  // "session missing" just means we were already signed out.
  if (error && !/session/i.test(error.message)) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Subscribe to sign-in / sign-out / token refresh. Returns an unsubscribe fn. */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Map a Supabase auth failure to one of the wireframe messages.
 *
 * `error_code` is matched first because it is stable; the message text is only a
 * fallback. Server misconfiguration (a disabled provider) must never be reported
 * as a wrong password — that sent us hunting for a credentials bug once already.
 *
 * Deactivated accounts are banned via the Admin API, so Supabase reports them as
 * a banned user: those members belong back at their gym, not at a password field.
 */
export function friendlyAuthMessage(error: unknown, mode: 'phone' | 'email'): string {
  const wrongCredentials = mode === 'phone' ? AUTH_MESSAGES.wrongPhone : AUTH_MESSAGES.wrongEmail;
  const { code, message } = describeError(error);

  switch (code) {
    case 'invalid_credentials':
      return wrongCredentials;
    case 'user_banned':
      return AUTH_MESSAGES.inactive;
    case 'email_not_confirmed':
    case 'phone_not_confirmed':
      return AUTH_MESSAGES.inactive;
    case 'email_provider_disabled':
      return AUTH_MESSAGES.emailDisabled;
    case 'phone_provider_disabled':
    case 'sms_provider_disabled':
      return AUTH_MESSAGES.phoneDisabled;
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return AUTH_MESSAGES.tooMany;
    default:
      break;
  }

  if (!message) return AUTH_MESSAGES.generic;
  if (message.includes('banned')) return AUTH_MESSAGES.inactive;
  if (message.includes('invalid login credentials')) return wrongCredentials;
  if (message.includes('email logins are disabled')) return AUTH_MESSAGES.emailDisabled;
  if (message.includes('phone logins are disabled')) return AUTH_MESSAGES.phoneDisabled;
  if (message.includes('not confirmed')) return AUTH_MESSAGES.inactive;
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return AUTH_MESSAGES.offline;
  }
  if (message.includes('rate limit')) return AUTH_MESSAGES.tooMany;
  return wrongCredentials;
}

/**
 * Pull code + message out of whatever was thrown. Auth failures are AuthError
 * instances, but PostgREST returns plain objects, so neither shape can be
 * assumed.
 */
function describeError(error: unknown): { code?: string; message: string } {
  if (error instanceof Error) {
    const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined;
    return { code, message: error.message.toLowerCase() };
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const code =
      typeof record.error_code === 'string'
        ? record.error_code
        : typeof record.code === 'string'
          ? record.code
          : undefined;
    const raw = typeof record.msg === 'string' ? record.msg : record.message;
    return { code, message: typeof raw === 'string' ? raw.toLowerCase() : '' };
  }
  return { message: '' };
}
