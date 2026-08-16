import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { duration, easing, useReduceMotion } from '@/theme/motion';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

/**
 * The app's one emotional beat. Full-width lime, above the exercise it belongs
 * to — replaces the 12px "🔥 PR" chip.
 */
export function PRBanner({
  exercise,
  best,
  gain,
  unit,
}: {
  exercise: string;
  best: number;
  gain: number;
  unit: string;
}) {
  const reduce = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduce ? duration.reduced : duration.dialogIn,
      easing: easing.emphasized,
    });
  }, [progress, reduce, exercise, best]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduce ? [] : [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  return (
    <Animated.View style={[styles.banner, style]}>
      <Icon name="award" size={30} color={colors.accentDark} />
      <View style={styles.text}>
        <Text style={styles.title}>
          NEW PR · {best} {unit.toUpperCase()}
        </Text>
        <Text style={styles.sub}>
          {exercise} · +{Math.round(gain * 10) / 10} {unit} on your best
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    padding: space.lg - 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg - 2,
  },
  text: { flex: 1, gap: 1 },
  title: {
    ...type.display2,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: 0.5,
    color: colors.accentDark,
  },
  sub: { ...type.bodySm, fontFamily: fonts.bodyMed, color: colors.accentDark },
});
