import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { DAYS, type DayOfWeek } from '@/lib/days';
import { colors, radius, space, type } from '@/theme/tokens';

type DayListProps = {
  /** Exercise count per day, for the "N exercises" line. */
  counts: Map<DayOfWeek, number>;
  today: DayOfWeek | null;
  onSelect: (day: DayOfWeek) => void;
};

/**
 * Mon–Sat as one surface of rows (replaces the 2-column DayGrid): a list scans
 * faster than a grid, and today gets a lime bar + fill it cannot lose.
 * Sunday is one quiet line — never a dashed box.
 */
export function DayList({ counts, today, onSelect }: DayListProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.surface}>
        {DAYS.map(({ value, long }, index) => {
          const count = counts.get(value) ?? 0;
          const isToday = value === today;
          return (
            <View key={value}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={() => onSelect(value)}
                accessibilityRole="button"
                accessibilityLabel={`${long}, ${count} exercises${isToday ? ', today' : ''}`}
                style={({ pressed }) => [
                  styles.row,
                  isToday && styles.rowToday,
                  pressed && styles.pressed,
                ]}
              >
                {isToday ? <View style={styles.bar} /> : null}
                <Text style={[styles.name, isToday && styles.nameToday]} numberOfLines={1}>
                  {long}
                </Text>
                {isToday ? (
                  <Text style={styles.todayLabel}>Today</Text>
                ) : (
                  <Text style={styles.meta}>
                    {count === 0 ? 'Empty' : `${count} exercise${count === 1 ? '' : 's'}`}
                  </Text>
                )}
                <Icon name="chevron-right" size={18} color={isToday ? colors.accent : colors.dim} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.rest} accessibilityLabel="Sunday is a rest day">
        <Icon name="moon" size={15} color={colors.dim} />
        <Text style={styles.restLabel}>Sunday · rest day</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  surface: { backgroundColor: colors.card, borderRadius: radius.card - 2, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 14 },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 14,
  },
  rowToday: { minHeight: 58, backgroundColor: colors.accentDark },
  bar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
  },
  pressed: { opacity: 0.8 },
  name: { ...type.display3, flex: 1, color: colors.text },
  nameToday: { ...type.display3, fontSize: 24, color: colors.accent },
  meta: { ...type.bodySm, color: colors.dim },
  todayLabel: { ...type.label, fontSize: 11, color: colors.accent },
  restLabel: { ...type.bodySm, color: colors.dim },
  rest: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
});
