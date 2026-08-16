import { StyleSheet, Text, View } from 'react-native';

import type { ComparisonRow } from '@/api/charts';
import { kgToDisplay, type Unit } from '@/lib/units';
import { colors, space, type } from '@/theme/tokens';

export type ComparisonBarsProps = {
  rows: readonly ComparisonRow[];
  weekA: number;
  weekB: number;
  unit: Unit;
};

/**
 * Best set per exercise, week A vs week B — now HORIZONTAL, so the exercise name
 * sits on its own bar and the numbered key list underneath disappears entirely.
 * Pure RN views: no Skia font loading, no axis labels to squint at.
 */
export function ComparisonBars({ rows, weekA, weekB, unit }: ComparisonBarsProps) {
  const values = rows.flatMap((row) => [
    row.weekA === null ? 0 : kgToDisplay(row.weekA, unit),
    row.weekB === null ? 0 : kgToDisplay(row.weekB, unit),
  ]);
  const max = Math.max(...values, 1);
  const improved = rows.filter(
    (row) => row.weekA !== null && row.weekB !== null && row.weekB > row.weekA,
  ).length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.headline}>
        <Text style={styles.headlineValue}>
          {improved} of {rows.length}
        </Text>
        <Text style={styles.headlineLabel}>lifts up since week {weekA}</Text>
      </View>

      <View style={styles.list}>
        {rows.map((row) => {
          const a = row.weekA === null ? 0 : kgToDisplay(row.weekA, unit);
          const b = row.weekB === null ? 0 : kgToDisplay(row.weekB, unit);
          const delta =
            row.weekA !== null && row.weekB !== null ? Math.round((b - a) * 10) / 10 : null;
          const down = delta !== null && delta < 0;

          return (
            <View key={row.exerciseId} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.name} numberOfLines={1}>
                  {row.name}
                </Text>
                <Text style={styles.values}>
                  {row.weekA === null ? '—' : a} → {row.weekB === null ? '—' : b}
                </Text>
                {delta !== null && delta !== 0 ? (
                  <Text style={down ? styles.deltaDown : styles.deltaUp}>
                    {delta > 0 ? '+' : '−'}
                    {Math.abs(delta)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.bars}>
                <View style={[styles.barA, { width: `${(a / max) * 100}%` }]} />
                <View
                  style={[styles.barB, down && styles.barDown, { width: `${(b / max) * 100}%` }]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.keyA} />
          <Text style={styles.legendLabel}>Week {weekA}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.keyB} />
          <Text style={styles.legendLabel}>Week {weekB}</Text>
        </View>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  headlineValue: { ...type.num1, color: colors.accent },
  headlineLabel: { ...type.bodySm, flex: 1, color: colors.muted },
  list: { gap: 14 },
  item: { gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  name: { ...type.bodyMed, flex: 1, fontSize: 13, color: colors.text },
  values: { ...type.num2, fontSize: 18, color: colors.text },
  deltaUp: { ...type.bodyMed, fontSize: 12, color: colors.accent },
  deltaDown: { ...type.bodyMed, fontSize: 12, color: colors.danger },
  bars: { gap: 3 },
  barA: { height: 6, borderRadius: 3, backgroundColor: colors.barTrack, minWidth: 3 },
  barB: { height: 12, borderRadius: 3, backgroundColor: colors.accent, minWidth: 3 },
  barDown: { backgroundColor: colors.danger },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyA: { width: 14, height: 4, borderRadius: 2, backgroundColor: colors.barTrack },
  keyB: { width: 14, height: 8, borderRadius: 2, backgroundColor: colors.accent },
  legendLabel: { ...type.micro, color: colors.dim },
  unit: { ...type.micro, flex: 1, textAlign: 'right', color: colors.dim },
});

export default ComparisonBars;
