// Per-weight subpath imports: the package roots pull in every weight (~12 MB of
// unused TTFs). We ship exactly the three faces in src/theme/tokens.ts.
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AUTH_MESSAGES, signOut } from '@/api/auth';
import { Button } from '@/components/Button';
import { ErrorState, LoadingState } from '@/components/Screen';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { initMonitoring } from '@/lib/monitoring';
import { destinationFor, needsRedirect } from '@/lib/routing';
import { colors, fonts, space } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
initMonitoring();

/**
 * Server state defaults. Writes retry with backoff because the log screen
 * auto-saves while the user keeps typing (architecture §3).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Keep cached reads usable offline for a week (architecture §4).
      gcTime: 7 * 24 * 60 * 60_000,
    },
    mutations: { retry: 3 },
  },
});

/**
 * Persisted cache: plans, logs and charts stay readable with no network.
 * Writes still need a connection in v1 and surface a clear error.
 */
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'repbook.query-cache',
  throttleTime: 2000,
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  // Keep the (dark) splash up until fonts resolve; a font failure must not
  // trap the user behind the splash screen.
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.blank} />;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * 24 * 60 * 60_000,
        // Never write another account's data to disk under this one's cache.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
            }}
          >
            {/* Forced password change is blocking: no swipe-back out of it. */}
            <Stack.Screen name="change-password" options={{ gestureEnabled: false }} />
          </Stack>
        </AuthGate>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

/**
 * Session + role router (docs/03-architecture.md §3):
 *   no session            → /login
 *   must_change_password  → /change-password   (blocking)
 *   member && !onboarded  → /plan-setup
 *   member                → /            (tabs)
 *   gym_admin             → /members
 *   super_admin           → /dashboard
 *
 * Children stay unmounted until the destination matches the current route, so
 * no screen from the wrong role ever flashes.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const queryCache = useQueryClient();

  const { session, isLoading: sessionLoading } = useSession();
  const userId = session?.user.id;
  const { data: profile, isLoading: profileLoading, isError, refetch } = useProfile(userId);

  // Never let one account's cached data survive into another's session.
  const previousUserId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== userId) queryCache.clear();
    previousUserId.current = userId;
  }, [userId, queryCache]);

  const resolving = sessionLoading || (Boolean(userId) && profileLoading);
  const profileMissing = !resolving && Boolean(userId) && !isError && profile === null;
  const deactivated = profile?.is_active === false;
  // A signed-in user with no profile row, or a deactivated one, has no valid
  // place in the app. Say so explicitly: silently bouncing back to login looks
  // like a broken password field.
  const blocked = profileMissing || deactivated;

  const destination = destinationFor(Boolean(session), profile ?? null);
  const redirecting = !resolving && !isError && !blocked && needsRedirect(destination, segments);

  useEffect(() => {
    if (redirecting) router.replace(destination);
  }, [redirecting, destination, router]);

  if (Boolean(userId) && isError) {
    return (
      <View style={styles.gate}>
        <ErrorState
          message="Couldn't load your profile. Check your connection and try again."
          onRetry={() => void refetch()}
        />
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    );
  }

  if (blocked) {
    return (
      <View style={styles.gate}>
        <ErrorState
          message={
            deactivated
              ? AUTH_MESSAGES.inactive
              : "This account has no RepBook profile yet, so it has no role. Ask your gym to set it up (or run supabase/fix-missing-profiles.sql if this is your own account)."
          }
        />
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    );
  }

  if (resolving || redirecting) {
    return (
      <View style={styles.gate}>
        <Text style={styles.wordmark}>REPBOOK</Text>
        <LoadingState />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  gate: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 2,
    color: colors.text,
  },
});
