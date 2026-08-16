import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, space, type } from '@/theme/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  /** Screen-owning titles (Home, Plan setup) use display1 instead of display2. */
  large?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  back = false,
  right,
  large = false,
}: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Icon name="chevron-left" size={24} color={colors.text} />
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        <Text style={large ? styles.titleLarge : styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {right ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  titles: { flex: 1, gap: 1 },
  title: { ...type.display2, color: colors.text },
  titleLarge: { ...type.display1, color: colors.text },
  subtitle: { ...type.bodySm, color: colors.muted },
});
