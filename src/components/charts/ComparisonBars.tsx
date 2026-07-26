import { useFont } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';
import { BarGroup, CartesianChart } from 'victory-native';

import type { ComparisonRow } from '@/api/charts';
import type { Unit } from '@/lib/units';
import { kgToDisplay } from '@/lib/units';
import { colors, fonts, space } from '@/theme/tokens';

// Axis labels are drawn by Skia, which needs the font file itself.
const AXIS_FONT = require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');

export type ComparisonBarsProps = {
  rows: readonly ComparisonRow[];
  weekA: number;
  weekB: number;
  unit: Unit;
};

type Datum = { index: number; a: number; b: number };

/**
 * Best set per exercise, week A (gray) vs week B (lime) — wireframe screen 5.
 * X labels are the numbers from the key list underneath: exercise names are far
 * too long to sit under bars on a phone.
 */
export function ComparisonBars({ rows, weekA, weekB, unit }: ComparisonBarsProps) {
  const font = useFont(AXIS_FONT, 11);

  const data: Datum[] = rows.map((row, index) => ({
    index: index + 1,
    a: row.weekA === null ? 0 : kgToDisplay(row.weekA, unit),
    b: row.weekB === null ? 0 : kgToDisplay(row.weekB, unit),
  }));

  // Bars must start at zero, and the top needs headroom so the tallest bar and
  // its label aren't clipped by the plot edge.
  const highest = data.reduce((max, datum) => Math.max(max, datum.a, datum.b), 0);
  const yMax = highest === 0 ? 10 : Math.ceil((highest * 1.15) / 5) * 5;

  return (
    <View style={styles.wrapper}>
      <View style={styles.legend}>
        <LegendDot color={colors.dim} label={`Week ${weekA}`} />
        <LegendDot color={colors.accent} label={`Week ${weekB}`} />
        <Text style={styles.axisNote}>{unit}</Text>
      </View>

      <View style={styles.chart}>
        <CartesianChart
          data={data}
          xKey="index"
          yKeys={['a', 'b']}
          domain={{ y: [0, yMax] }}
          domainPadding={{ left: 42, right: 42, top: 12 }}
          padding={{ left: 4, right: 8, top: 4, bottom: 4 }}
          axisOptions={{
            font,
            lineColor: colors.line,
            labelColor: colors.dim,
            formatXLabel: (value) => String(value ?? ''),
            formatYLabel: (value) => String(Math.round(value ?? 0)),
          }}
        >
          {({ points, chartBounds }) => (
            <BarGroup
              chartBounds={chartBounds}
              betweenGroupPadding={0.4}
              withinGroupPadding={0.2}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
            >
              <BarGroup.Bar points={points.a} color={colors.dim} />
              <BarGroup.Bar points={points.b} color={colors.accent} />
            </BarGroup>
          )}
        </CartesianChart>
      </View>

      <View style={styles.keyList}>
        {rows.map((row, index) => {
          const delta =
            row.weekA !== null && row.weekB !== null
              ? kgToDisplay(row.weekB, unit) - kgToDisplay(row.weekA, unit)
              : null;
          return (
            <Text key={row.exerciseId} style={styles.keyRow} numberOfLines={1}>
              <Text style={styles.keyIndex}>{index + 1}. </Text>
              {row.name}
              <Text style={styles.keyValues}>
                {'  '}
                {row.weekA === null ? '—' : kgToDisplay(row.weekA, unit)} →{' '}
                {row.weekB === null ? '—' : kgToDisplay(row.weekB, unit)} {unit}
              </Text>
              {delta !== null && delta !== 0 ? (
                <Text style={delta > 0 ? styles.up : styles.down}>
                  {'  '}
                  {delta > 0 ? '▲' : '▼'}
                  {Math.abs(Math.round(delta * 10) / 10)}
                </Text>
              ) : null}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  axisNote: { flex: 1, textAlign: 'right', fontFamily: fonts.body, fontSize: 11, color: colors.dim },
  chart: { height: 220 },
  keyList: { gap: 2 },
  keyRow: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  keyIndex: { fontFamily: fonts.bodyMed, color: colors.text },
  keyValues: { fontFamily: fonts.bodyMed, color: colors.text },
  up: { fontFamily: fonts.bodyMed, color: colors.accent },
  down: { fontFamily: fonts.bodyMed, color: colors.danger },
});

export default ComparisonBars;
