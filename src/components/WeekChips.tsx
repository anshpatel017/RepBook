import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type WeekChipsProps = {
  weeks: readonly number[];
  currentWeek: number;
  loggedWeeks: readonly number[];
  onSelect: (week: number) => void;
  onNewWeek: () => void;
  creatingWeek?: boolean;
};

/** Week 1 ·✓  Week 2 ·✓  … (Week 4)  ＋ New week  (wireframe screen 3). */
export function WeekChips({
  weeks,
  currentWeek,
  loggedWeeks,
  onSelect,
  onNewWeek,
  creatingWeek = false,
}: WeekChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {weeks.map((week) => {
        const isCurrent = week === currentWeek;
        const hasData = loggedWeeks.includes(week);
        return (
          <Pressable
            key={week}
            onPress={() => onSelect(week)}
            accessibilityRole="button"
            accessibilityLabel={`Week ${week}${hasData ? ', logged' : ''}`}
            style={({ pressed }) => [
              styles.chip,
              isCurrent && styles.chipCurrent,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, isCurrent && styles.labelCurrent]}>
              Week {week}
              {hasData ? ' ·✓' : ''}
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onNewWeek}
        disabled={creatingWeek}
        accessibilityRole="button"
        accessibilityLabel="Start a new week"
        style={({ pressed }) => [
          styles.chip,
          styles.chipNew,
          pressed && styles.pressed,
          creatingWeek && styles.pressed,
        ]}
      >
        <Text style={[styles.label, styles.labelNew]}>＋ New week</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
  chip: {
    minHeight: HIT_SLOP_MIN - 8,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  chipCurrent: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  chipNew: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
  labelCurrent: { color: colors.accent },
  labelNew: { color: colors.muted },
});
