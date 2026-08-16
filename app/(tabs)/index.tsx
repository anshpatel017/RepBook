import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayList } from '@/components/DayList';
import { Icon } from '@/components/Icon';
import { ErrorState, LoadingState, Screen } from '@/components/Screen';
import { StatRow } from '@/components/StatRow';
import { useProfile } from '@/hooks/useProfile';
import { useMemberStats, usePlan } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { DAYS, dayLong, todayDay, type DayOfWeek } from '@/lib/days';
import { kgToDisplay } from '@/lib/units';
import { colors, fonts, radius, space, type, CONTROL } from '@/theme/tokens';

/**
 * Member home. Hierarchy, top to bottom: today (display1) → the one CTA →
 * passive stats → the week. Home to today's log is still one tap.
 */
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

  const todayCount = today ? (counts.get(today) ?? 0) : 0;
  const bestDisplay =
    stats.data?.bestKg == null ? '—' : String(kgToDisplay(stats.data.bestKg, unit));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>REPBOOK</Text>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Icon name="settings" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.titles}>
          <Text style={styles.today}>{(today ? dayLong(today) : 'Sunday').toUpperCase()}</Text>
          <Text style={styles.subtitle}>
            Week {week}
            {today
              ? ` · ${todayCount === 0 ? 'nothing planned' : `${todayCount} exercise${todayCount === 1 ? '' : 's'} planned`}`
              : ' · rest day'}
          </Text>
        </View>

        {today ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/log/[day]/[week]', params: { day: today, week } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Start ${dayLong(today)}'s workout, week ${week}`}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <View style={styles.ctaText}>
              <Text style={styles.ctaLabel}>START WORKOUT</Text>
              <Text style={styles.ctaMeta}>Week {week} · beat last week</Text>
            </View>
            <View style={styles.ctaIcon}>
              <Icon name="play" size={22} color={colors.accent} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.rest}>
            <Icon name="moon" size={22} color={colors.muted} />
            <View style={styles.ctaText}>
              <Text style={styles.restLabel}>REST DAY</Text>
              <Text style={styles.restMeta}>Recover well. Pick any day below to review it.</Text>
            </View>
          </View>
        )}

        {stats.isLoading ? (
          <LoadingState />
        ) : (
          <StatRow
            stats={[
              { value: String(stats.data?.weeksLogged ?? 0), label: 'Weeks' },
              { value: String(stats.data?.totalSets ?? 0), label: 'Sets' },
              { value: bestDisplay, label: `Best ${unit}`, accent: true },
            ]}
          />
        )}

        <View style={styles.week}>
          <Text style={styles.sectionTitle}>Your week</Text>

          {plan.isLoading ? (
            <LoadingState />
          ) : plan.isError ? (
            <ErrorState
              message="Couldn't load your plan. Check your connection and try again."
              onRetry={() => void plan.refetch()}
            />
          ) : (
            <DayList
              counts={counts}
              today={today}
              onSelect={(day) => router.push({ pathname: '/day/[day]', params: { day } })}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingTop: space.lg, paddingBottom: space.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { ...type.display3, flex: 1, fontSize: 20, letterSpacing: 2, color: colors.dim },
  gear: { width: 40, height: 40, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  titles: { gap: 2 },
  today: { ...type.display1, color: colors.text },
  subtitle: { ...type.bodySm, color: colors.muted },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.card,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: { opacity: 0.9 },
  ctaText: { flex: 1, gap: 2 },
  ctaLabel: { ...type.display2, color: colors.accentDark },
  ctaMeta: { ...type.bodySm, fontFamily: fonts.bodyMed, color: colors.accentDark },
  ctaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rest: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 18,
    minHeight: CONTROL.cta + 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  restLabel: { ...type.display2, color: colors.muted },
  restMeta: { ...type.bodySm, color: colors.dim },
  week: { gap: space.md - 2 },
  sectionTitle: { ...type.label, fontSize: 11, letterSpacing: 1.2, color: colors.dim },
});
