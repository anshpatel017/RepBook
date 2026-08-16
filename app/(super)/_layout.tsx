import { Stack } from 'expo-router';

import { stackMotion } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Super admin stack (wireframes screens 9 and 10). */
export default function SuperLayout() {
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
