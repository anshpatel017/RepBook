import { Stack } from 'expo-router';

import { stackMotion } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Gym admin stack (wireframes screens 7 and 8). */
export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        ...stackMotion,
      }}
    />
  );
}
