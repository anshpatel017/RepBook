import Constants from 'expo-constants';

type Extra = { supabaseUrl?: string; supabaseAnonKey?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  supabaseUrl: extra.supabaseUrl ?? '',
  supabaseAnonKey: extra.supabaseAnonKey ?? '',
};

/** True once SUPABASE_URL + SUPABASE_ANON_KEY are set in .env. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

/**
 * Read a required public env value. Throws with an actionable message so a
 * missing .env fails loudly at startup instead of as a confusing network error.
 */
export function requireEnv(key: keyof typeof env): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `Missing ${key} — add SUPABASE_URL and SUPABASE_ANON_KEY to .env (see .env.example), then restart Expo with a cleared cache: npx expo start -c`,
    );
  }
  return value;
}
