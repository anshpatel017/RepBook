import { useFont } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';

import type { TrendPoint } from '@/api/charts';
import { kgToDisplay, type Unit } from '@/lib/units';
import { colors, fonts, space } from '@/theme/tokens';

const AXIS_FONT = require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');

export type TrendLineProps = {
  points: readonly TrendPoint[];
  unit: Unit;
};

/** One exercise's best set across all weeks — wireframe screen 5, lower chart. */
export function TrendLine({ points, unit }: TrendLineProps) {
  const font = useFont(AXIS_FONT, 11);

  const data = points.map((point) => ({
    week: point.week,
    best: kgToDisplay(point.bestKg, unit),
  }));

  const values = data.map((datum) => datum.best);
  const lowest = values.length > 0 ? Math.min(...values) : 0;
  const highest = values.length > 0 ? Math.max(...values) : 0;
  // A flat trend would otherwise collapse onto the axis: give it breathing room.
  const pad = Math.max(2.5, (highest - lowest) * 0.25);

  const first = values[0];
  const last = values[values.length - 1];
  const delta = first !== undefined && last !== undefined ? last - first : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.summary}>
        <Text style={styles.axisNote}>
          Week {points[0]?.week ?? 1} → {points[points.length - 1]?.week ?? 1} · best set ({unit})
        </Text>
        {delta !== null ? (
          <Text
            style={[styles.delta, delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaFlat]}
          >
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(Math.round(delta * 10) / 10)} {unit}
          </Text>
        ) : null}
      </View>

      <View style={styles.chart}>
        <CartesianChart
          data={data}
          xKey="week"
          yKeys={['best']}
          domain={{ y: [Math.max(0, lowest - pad), highest + pad] }}
          domainPadding={{ left: 24, right: 24, top: 16, bottom: 8 }}
          padding={{ left: 4, right: 8, top: 4, bottom: 4 }}
          axisOptions={{
            font,
            lineColor: colors.line,
            labelColor: colors.dim,
            formatXLabel: (value) => `W${value ?? ''}`,
            formatYLabel: (value) => String(Math.round(value ?? 0)),
          }}
        >
          {({ points: chartPoints }) => (
            <>
              <Line
                points={chartPoints.best}
                color={colors.accent}
                strokeWidth={3}
                curveType="linear"
                animate={{ type: 'timing', duration: 250 }}
              />
              <Scatter points={chartPoints.best} radius={4} color={colors.accent} />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  axisNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  delta: { fontFamily: fonts.bodyMed, fontSize: 13 },
  deltaUp: { color: colors.accent },
  deltaDown: { color: colors.danger },
  deltaFlat: { color: colors.muted },
  chart: { height: 210 },
});

export default TrendLine;
