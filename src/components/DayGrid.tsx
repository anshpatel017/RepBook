import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAYS, type DayOfWeek } from '@/lib/days';
import { colors, fonts, radius, space } from '@/theme/tokens';

type DayGridProps = {
  /** Exercise count per day, for the "N exercises" line. */
  counts: Map<DayOfWeek, number>;
  today: DayOfWeek | null;
  onSelect: (day: DayOfWeek) => void;
};

/** 2-column Mon–Sat grid + the static Sunday rest card (wireframe screen 2). */
export function DayGrid({ counts, today, onSelect }: DayGridProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        {DAYS.map(({ value, long }) => {
          const count = counts.get(value) ?? 0;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              accessibilityRole="button"
              accessibilityLabel={`${long}, ${count} exercises`}
              style={({ pressed }) => [
                styles.day,
                value === today && styles.dayToday,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.dayName, value === today && styles.dayNameToday]}>{long}</Text>
              <Text style={styles.dayMeta}>
                {count === 0 ? 'No exercises' : `${count} exercise${count === 1 ? '' : 's'}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rest} accessibilityLabel="Sunday is a rest day">
        <Text style={styles.restLabel}>Sunday · Rest day 😴</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  day: {
    // Two per row, accounting for the gap.
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 2,
  },
  dayToday: { borderColor: colors.accent },
  pressed: { opacity: 0.8 },
  dayName: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  dayNameToday: { color: colors.accent },
  dayMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  rest: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  restLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.dim },
});
