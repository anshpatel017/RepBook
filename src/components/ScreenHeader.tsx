import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space, HIT_SLOP_MIN } from '@/theme/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, back = false, right }: ScreenHeaderProps) {
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
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {right ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
  },
  back: {
    width: HIT_SLOP_MIN,
    height: HIT_SLOP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space.md,
  },
  backGlyph: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.text },
  titles: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 0.5, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
