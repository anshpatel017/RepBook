import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WeekChips } from '@/components/WeekChips';
import { useLoggedWeeks } from '@/hooks/useDayLog';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { dayLong, parseDay } from '@/lib/days';
import { colors, radius, space, type, CONTROL } from '@/theme/tokens';

/**
 * Week picker for one day. The plan is no longer a bare numbered text list —
 * it is a surface of rows, so picking a week isn't blind.
 */
export default function DayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = parseDay(params.day);

  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const plan = usePlan(userId);

  const exercises = useMemo(() => (day ? (plan.byDay.get(day) ?? []) : []), [day, plan.byDay]);
  const exerciseIds = useMemo(() => exercises.map((exercise) => exercise.id), [exercises]);
  const logged = useLoggedWeeks(day ?? 1, exerciseIds);

  const currentWeek = profile?.current_week ?? 1;
  const weeks = useMemo(
    () => Array.from({ length: currentWeek }, (_, index) => index + 1),
    [currentWeek],
  );

  const startNewWeek = useCallback(async () => {
    if (!day) return;
    const next = currentWeek + 1;
    await updateProfile.mutateAsync({ current_week: next });
    router.push({ pathname: '/log/[day]/[week]', params: { day, week: next } });
  }, [day, currentWeek, updateProfile, router]);

  if (!day) {
    return (
      <Screen center>
        <EmptyState
          title="Unknown day"
          hint="Sunday is always a rest day — go back and pick Mon–Sat."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={dayLong(day).toUpperCase()} subtitle="Pick a week" back />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {plan.isLoading ? (
          <LoadingState />
        ) : plan.isError ? (
          <ErrorState
            message="Couldn't load this day. Check your connection and try again."
            onRetry={() => void plan.refetch()}
          />
        ) : (
          <>
            <WeekChips
              weeks={weeks}
              currentWeek={currentWeek}
              loggedWeeks={logged.data ?? []}
              onSelect={(week) =>
                router.push({ pathname: '/log/[day]/[week]', params: { day, week } })
              }
              onNewWeek={() => void startNewWeek()}
              creatingWeek={updateProfile.isPending}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>This day&apos;s plan</Text>
              {exercises.length === 0 ? (
                <Text style={styles.empty}>
                  No exercises yet. Open any week to add your first one.
                </Text>
              ) : (
                exercises.map((exercise, index) => (
                  <View key={exercise.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.row}>
                      <Text style={styles.index}>{index + 1}</Text>
                      <Text style={styles.name} numberOfLines={1}>
                        {exercise.name}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Pressable
              onPress={() =>
                router.push({ pathname: '/log/[day]/[week]', params: { day, week: currentWeek } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open week ${currentWeek}`}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Icon name="play" size={18} color={colors.accentDark} />
              <Text style={styles.ctaLabel}>OPEN WEEK {currentWeek}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  cardTitle: { ...type.label, fontSize: 11, letterSpacing: 1.2, color: colors.dim },
  divider: { height: 1, backgroundColor: colors.line },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.md },
  index: { ...type.num2, fontSize: 16, width: 18, color: colors.dim },
  name: { ...type.body, flex: 1, fontSize: 14, color: colors.text },
  empty: { ...type.bodySm, color: colors.muted },
  cta: {
    height: CONTROL.cta,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  pressed: { opacity: 0.9 },
  ctaLabel: { ...type.display3, letterSpacing: 1, color: colors.accentDark },
});
