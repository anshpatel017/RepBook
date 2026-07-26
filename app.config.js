/**
 * Single source of app configuration.
 *
 * Plain JS on purpose: eas-cli transpiles a TypeScript app.config.ts through its
 * own loader, which fails on this project ("Cannot read properties of undefined
 * (reading 'CommonJS')"). A .js config is read identically by expo start, expo
 * export and EAS, with no transpile step involved.
 *
 * Env vars come from .env (Expo loads it automatically) and are forwarded to the
 * app through `extra`. Only PUBLIC values belong here — the Supabase
 * service-role key must never leave the Edge Functions environment.
 *
 * @type {import('expo/config').ExpoConfig}
 */
const config = {
  name: 'RepBook',
  slug: 'repbook',
  version: '0.1.0',
  scheme: 'repbook',
  owner: 'ansh18',
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
  // EAS Update, so JS-only fixes can ship without a store release. Required
  // once expo-updates is installed; EAS can't write these into a dynamic config.
  updates: {
    url: 'https://u.expo.dev/ab395213-1efc-4beb-b086-aad184549347',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    // Optional: crash reporting stays off entirely when this is empty.
    sentryDsn: process.env.SENTRY_DSN ?? '',
    eas: {
      // Written by hand: EAS cannot edit a dynamic config for us.
      projectId: 'ab395213-1efc-4beb-b086-aad184549347',
    },
  },
};

module.exports = config;
