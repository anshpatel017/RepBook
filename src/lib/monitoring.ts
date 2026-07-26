import Constants from 'expo-constants';

type SentryModule = typeof import('@sentry/react-native');

/**
 * Crash reporting, entirely inert until a DSN is present.
 *
 * The SDK is required lazily rather than imported at the top: with no DSN it is
 * never loaded at all, so Expo Go (which has no RNSentry native module) and
 * anyone cloning the repo without a Sentry account are completely unaffected.
 *
 * Add to .env:  SENTRY_DSN=https://…@…ingest.sentry.io/…
 */
export function initMonitoring(): void {
  const dsn = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;
  if (!dsn) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as SentryModule;
    Sentry.init({
      dsn,
      // Workout data is private: never attach request bodies or user identifiers.
      sendDefaultPii: false,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch {
    // Monitoring must never be the reason the app fails to start.
  }
}
