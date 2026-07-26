import type { ExpoConfig } from 'expo/config';

/**
 * Single source of app configuration.
 *
 * Env vars are read from `.env` (Expo loads it automatically) and forwarded to
 * the app through `extra`. Only PUBLIC values belong here — the Supabase
 * service-role key must never leave the Edge Functions environment.
 */
const config: ExpoConfig = {
  name: 'RepBook',
  slug: 'repbook',
  version: '0.1.0',
  scheme: 'repbook',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#101113',
  ios: {
    bundleIdentifier: 'com.repbook.app',
    supportsTablet: false,
  },
  android: {
    package: 'com.repbook.app',
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#101113',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    // Optional: crash reporting stays off entirely when this is empty.
    sentryDsn: process.env.SENTRY_DSN ?? '',
  },
};

export default config;
