import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ComparisonBarsHost, TrendLineHost } from '@/components/charts/ChartHosts';
import { Picker } from '@/components/Picker';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useComparison, useTrend } from '@/hooks/useChartData';
import { useProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { DAYS, todayDay, type DayOfWeek } from '@/lib/days';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Member progress (wireframe screen 5): week-vs-week bars + one-exercise trend. */
export default function ChartsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const plan = usePlan(userId);

  const unit = profile?.unit ?? 'kg';
  const currentWeek = profile?.current_week ?? 1;

  const [day, setDay] = useState<DayOfWeek>(() => todayDay() ?? 1);
  const [weekA, setWeekA] = useState(1);
  const [weekB, setWeekB] = useState(currentWeek);
  const [exerciseId, setExerciseId] = useState<string | undefined>(undefined);

  const dayExercises = plan.byDay.get(day) ?? [];
  const selectedExerciseId = exerciseId ?? dayExercises[0]?.id;

  const weekOptions = useMemo(
    () =>
      Array.from({ length: Math.max(currentWeek, weekB) }, (_, index) => ({
        value: index + 1,
        label: `Week ${index + 1}`,
      })),
    [currentWeek, weekB],
  );

  const comparison = useComparison(userId, day, weekA, weekB);
  const trend = useTrend(selectedExerciseId);

  const hasComparisonData = (comparison.data ?? []).some(
    (row) => row.weekA !== null || row.weekB !== null,
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="PROGRESS" subtitle="Beat last week" />

        <View style={styles.filters}>
          <Picker
            label="Day"
            value={day}
            options={DAYS.map(({ value, long }) => ({ value, label: long }))}
            onChange={(next) => {
              setDay(next);
              setExerciseId(undefined); // exercise list is per day
            }}
          />
        </View>
        <View style={styles.filters}>
          <Picker label="Compare" value={weekA} options={weekOptions} onChange={setWeekA} />
          <Picker label="With" value={weekB} options={weekOptions} onChange={setWeekB} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>BEST SET PER EXERCISE</Text>

          {plan.isLoading || comparison.isLoading ? (
            <LoadingState />
          ) : comparison.isError ? (
            <ErrorState
              message="Couldn't load this comparison."
              onRetry={() => void comparison.refetch()}
            />
          ) : dayExercises.length === 0 ? (
            <EmptyState
              title="Nothing planned for this day"
              hint="Pick another day, or add exercises from the day screen."
            />
          ) : weekA === weekB ? (
            <EmptyState title="Pick two different weeks" hint="Compare any week against another." />
          ) : !hasComparisonData ? (
            <EmptyState
              title="No logged sets for these weeks yet."
              hint="Log a workout and it shows up here."
            />
          ) : (
            <ComparisonBarsHost
              rows={comparison.data ?? []}
              weekA={weekA}
              weekB={weekB}
              unit={unit}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXERCISE OVER TIME</Text>

          {dayExercises.length > 0 ? (
            <View style={styles.filters}>
              <Picker
                label="Exercise"
                value={selectedExerciseId}
                options={dayExercises.map((exercise) => ({
                  value: exercise.id,
                  label: exercise.name,
                }))}
                onChange={setExerciseId}
              />
            </View>
          ) : null}

          {trend.isLoading ? (
            <LoadingState />
          ) : trend.isError ? (
            <ErrorState message="Couldn't load this trend." onRetry={() => void trend.refetch()} />
          ) : (trend.data ?? []).length < 2 ? (
            <EmptyState
              title="Log a few weeks to see the trend."
              hint="Two or more logged weeks draw a line."
            />
          ) : (
            <TrendLineHost points={trend.data ?? []} unit={unit} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.xxl },
  filters: { flexDirection: 'row', gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.dim },
});
