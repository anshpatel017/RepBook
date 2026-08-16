import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from '@/theme/tokens';

export type Stat = { value: string; label: string; accent?: boolean };

/**
 * Home / dashboard totals. Borderless: three numbers separated by hairlines,
 * so a passive stat can never compete with the CTA above it.
 * (Replaces three bordered StatCards in a row.)
 */
export function StatRow({ stats }: { stats: readonly Stat[] }) {
  return (
    <View style={styles.row}>
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.cell}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={[styles.body, index > 0 && styles.bodyOffset]}>
            <Text
              style={[styles.value, stat.accent && styles.valueAccent]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {stat.value}
            </Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Kept for the gym sheet, where two stats need their own surfaces. */
export function StatCard({ value, label, accent }: Stat) {
  return (
    <View style={styles.card}>
      <Text
        style={[styles.value, accent && styles.valueAccent]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 34, backgroundColor: colors.line },
  body: { flex: 1, gap: 2 },
  bodyOffset: { paddingLeft: space.lg },
  value: { ...type.num1, color: colors.text },
  valueAccent: { color: colors.accent },
  label: { ...type.label, fontSize: 11, color: colors.dim },
  card: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: 14,
    padding: space.lg - 2,
    gap: 2,
  },
});
