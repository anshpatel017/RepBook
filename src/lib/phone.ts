/**
 * Phone numbers are stored and authenticated in E.164 (+919876543210).
 * India (+91) is the default country because that's the launch market; a user
 * who types a full international number with "+" keeps their own code.
 */

export const DEFAULT_COUNTRY_CODE = '+91';

/** Same shape the Edge Functions validate against. */
const E164 = /^\+[1-9]\d{7,14}$/;

export function isE164(value: string): boolean {
  return E164.test(value);
}

/**
 * Turn user input into E.164, or null when it can't be one.
 *   "98765 43210"    → "+919876543210"
 *   "098765-43210"   → "+919876543210"
 *   "+91 9876543210" → "+919876543210"
 *   "0091 987..."    → "+91987..."
 */
export function normalizePhone(input: string, countryCode = DEFAULT_COUNTRY_CODE): string | null {
  const cleaned = input.replace(/[\s()\-.]/g, '');
  if (!cleaned) return null;

  let candidate: string;
  if (cleaned.startsWith('+')) {
    candidate = cleaned;
  } else if (cleaned.startsWith('00')) {
    candidate = `+${cleaned.slice(2)}`;
  } else {
    const digits = cleaned.replace(/^0+/, ''); // domestic trunk prefix
    const bare = countryCode.replace('+', '');
    candidate = digits.startsWith(bare) && digits.length > 10 ? `+${digits}` : `${countryCode}${digits}`;
  }

  return isE164(candidate) ? candidate : null;
}

/** "+919876543210" → "+91 98765 43210" (display only; never stored). */
export function formatPhone(e164: string): string {
  if (!isE164(e164)) return e164;
  if (e164.startsWith('+91') && e164.length === 13) {
    return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
  }
  return e164;
}

/** Digits a member types into the phone field, without the country code. */
export function localDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 12);
}
