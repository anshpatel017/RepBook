import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, space, type } from '@/theme/tokens';

type WeekChipsProps = {
  weeks: readonly number[];
  currentWeek: number;
  loggedWeeks: readonly number[];
  onSelect: (week: number) => void;
  onNewWeek: () => void;
  creatingWeek?: boolean;
};

/** Week 1 ✓ … [Week 4 · now]  + New week. The current week is a solid lime pill. */
export function WeekChips({
  weeks,
  currentWeek,
  loggedWeeks,
  onSelect,
  onNewWeek,
  creatingWeek = false,
}: WeekChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
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
              {isCurrent ? ' · now' : ''}
            </Text>
            {hasData && !isCurrent ? <Icon name="check" size={13} color={colors.accent} /> : null}
          </Pressable>
        );
      })}

      <Pressable
        onPress={onNewWeek}
        disabled={creatingWeek}
        accessibilityRole="button"
        accessibilityLabel="Start a new week"
        style={({ pressed }) => [styles.chip, (pressed || creatingWeek) && styles.pressed]}
      >
        <Icon name="plus" size={14} color={colors.accent} />
        <Text style={[styles.label, styles.labelNew]}>New week</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.card,
  },
  chipCurrent: { backgroundColor: colors.accent, paddingHorizontal: space.lg },
  pressed: { opacity: 0.8 },
  label: { ...type.bodyMed, fontSize: 14, color: colors.muted },
  labelCurrent: { color: colors.accentDark },
  labelNew: { color: colors.accent },
});
