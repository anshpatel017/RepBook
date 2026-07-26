import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayGrid } from '@/components/DayGrid';
import { ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { useProfile } from '@/hooks/useProfile';
import { useMemberStats, usePlan } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { DAYS, dayLong, todayDay, type DayOfWeek } from '@/lib/days';
import { kgToDisplay } from '@/lib/units';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Member home (wireframe screen 2). One tap from here to logging today. */
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;

  const { data: profile } = useProfile(userId);
  const plan = usePlan(userId);
  const stats = useMemberStats(userId);

  const today = todayDay();
  const week = profile?.current_week ?? 1;
  const unit = profile?.unit ?? 'kg';

  const counts = useMemo(() => {
    const map = new Map<DayOfWeek, number>();
    for (const { value } of DAYS) map.set(value, plan.byDay.get(value)?.length ?? 0);
    return map;
  }, [plan.byDay]);

  const bestDisplay = stats.data?.bestKg == null ? '—' : String(kgToDisplay(stats.data.bestKg, unit));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="REPBOOK"
          subtitle={today ? `${dayLong(today)} · Week ${week}` : `Sunday · Week ${week}`}
          right={
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={styles.gear}
            >
              <Text style={styles.gearGlyph}>⚙</Text>
            </Pressable>
          }
        />

        {today ? (
          <Pressable
            onPress={() => router.push({ pathname: '/log/[day]/[week]', params: { day: today, week } })}
            accessibilityRole="button"
            accessibilityLabel={`Start ${dayLong(today)}'s workout, week ${week}`}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaLabel}>▶ START {dayLong(today).toUpperCase()}&apos;S WORKOUT</Text>
            <Text style={styles.ctaMeta}>Week {week}</Text>
          </Pressable>
        ) : (
          <View style={[styles.cta, styles.ctaRest]}>
            <Text style={styles.ctaRestLabel}>Rest day — recover well 😴</Text>
            <Text style={styles.ctaMeta}>Pick any day below to review or edit it</Text>
          </View>
        )}

        {stats.isLoading ? (
          <LoadingState />
        ) : (
          <View style={styles.stats}>
            <StatCard value={String(stats.data?.weeksLogged ?? 0)} label="Weeks" />
            <StatCard value={String(stats.data?.totalSets ?? 0)} label="Sets" />
            <StatCard value={bestDisplay} label={`Best ${unit}`} />
          </View>
        )}

        <Text style={styles.sectionTitle}>YOUR WEEK</Text>

        {plan.isLoading ? (
          <LoadingState />
        ) : plan.isError ? (
          <ErrorState
            message="Couldn't load your plan. Check your connection and try again."
            onRetry={() => void plan.refetch()}
          />
        ) : (
          <DayGrid counts={counts} today={today} onSelect={(day) => router.push({ pathname: '/day/[day]', params: { day } })} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingBottom: space.xl },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 20, color: colors.muted },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    gap: 2,
  },
  pressed: { opacity: 0.9 },
  ctaLabel: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 0.5, color: colors.accentDark },
  ctaMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.accentDark, opacity: 0.8 },
  ctaRest: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  ctaRestLabel: { fontFamily: fonts.display, fontSize: 22, color: colors.muted },
  stats: { flexDirection: 'row', gap: space.sm },
  sectionTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.dim },
});
