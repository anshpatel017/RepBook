import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        // First-run setup is part of getting in: no swiping back to login.
        gestureEnabled: false,
      }}
    />
  );
}
