import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { requireEnv } from '@/lib/env';
import type { Database } from '@/types/db';

/**
 * The one and only Supabase client. Everything above this file goes through
 * src/api/* (enforced by eslint) — screens never import this directly.
 *
 * Sessions live in expo-secure-store (Keychain / Keystore). SecureStore refuses
 * values over 2048 bytes and a Supabase session (access + refresh token + user)
 * can exceed that, so values are transparently split into numbered chunks with
 * a small marker record under the original key.
 */
const CHUNK_SIZE = 1800;
const CHUNK_MARKER = 'repbook.chunks:';

const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function clearChunks(key: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
}

async function removeItem(key: string): Promise<void> {
  const stored = await SecureStore.getItemAsync(key);
  if (stored?.startsWith(CHUNK_MARKER)) {
    await clearChunks(key, Number(stored.slice(CHUNK_MARKER.length)) || 0);
  }
  await SecureStore.deleteItemAsync(key);
}

async function getItem(key: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(key);
  if (stored === null) return null;
  if (!stored.startsWith(CHUNK_MARKER)) return stored;

  const count = Number(stored.slice(CHUNK_MARKER.length));
  if (!Number.isInteger(count) || count < 1) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    // A missing chunk means a torn write: drop the record so the user is
    // treated as signed out rather than fed a corrupt session.
    if (part === null) {
      await removeItem(key);
      return null;
    }
    parts.push(part);
  }
  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i += 1) {
    await SecureStore.setItemAsync(
      chunkKey(key, i),
      value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
    );
  }
  // Marker last: if writing is interrupted, the next read finds no marker (or a
  // stale one with missing chunks) and falls back to "no session".
  await SecureStore.setItemAsync(key, `${CHUNK_MARKER}${count}`);
}

const secureStorage = { getItem, setItem, removeItem };

export const supabase = createClient<Database>(
  requireEnv('supabaseUrl'),
  requireEnv('supabaseAnonKey'),
  {
    auth: {
      // Web (expo start --web) has no SecureStore; supabase falls back to localStorage.
      storage: Platform.OS === 'web' ? undefined : secureStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // no OAuth redirects: phone/email + password only
    },
  },
);

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
