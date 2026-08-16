import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
import { colors, fonts } from '@/theme/tokens';

/** Member shell: Train + Progress. Crossfade between tabs, never a slide. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Bottom tabs take `animation` but not a duration in this version.
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.card, borderTopWidth: 0, height: 64, paddingTop: 8 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: { fontFamily: fonts.bodyMed, fontSize: 11, letterSpacing: 0.4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          tabBarIcon: ({ color }) => <Icon name="activity" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <Icon name="trending-up" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
