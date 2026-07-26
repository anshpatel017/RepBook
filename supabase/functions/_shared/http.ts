/** Shared HTTP helpers for every RepBook Edge Function. */

// The app calls these from native AND from expo web, so preflight must work.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function preflight(): Response {
  return new Response('ok', { headers: CORS_HEADERS });
}

/** Generated credentials: no 0/o/1/l/i confusion when read off a screen. */
export function generatePassword(length = 8): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((byte) => alphabet[byte % alphabet.length])
    .join('');
}

export function isE164(phone: unknown): phone is string {
  return typeof phone === 'string' && /^\+[1-9]\d{7,14}$/.test(phone);
}

export function isEmail(email: unknown): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length >= 1 && trimmed.length <= 80 ? trimmed : null;
}
