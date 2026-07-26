import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WeekChips } from '@/components/WeekChips';
import { useLoggedWeeks } from '@/hooks/useDayLog';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { usePlan } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { dayLong, parseDay } from '@/lib/days';
import { colors, fonts, space } from '@/theme/tokens';

/** Week picker for one day (wireframe screen 3). */
export default function DayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const day = parseDay(params.day);

  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);
  const plan = usePlan(userId);

  const exercises = useMemo(
    () => (day ? (plan.byDay.get(day) ?? []) : []),
    [day, plan.byDay],
  );
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
        <EmptyState title="Unknown day" hint="Sunday is always a rest day — go back and pick Mon–Sat." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title={dayLong(day)} subtitle="Pick a week" back />

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
              onSelect={(week) => router.push({ pathname: '/log/[day]/[week]', params: { day, week } })}
              onNewWeek={() => void startNewWeek()}
              creatingWeek={updateProfile.isPending}
            />

            <View style={styles.planBox}>
              <Text style={styles.planTitle}>THIS DAY&apos;S PLAN</Text>
              {exercises.length === 0 ? (
                <Text style={styles.planEmpty}>
                  No exercises yet. Open any week to add your first one 👇
                </Text>
              ) : (
                exercises.map((exercise, index) => (
                  <Text key={exercise.id} style={styles.planItem} numberOfLines={1}>
                    {index + 1}. {exercise.name}
                  </Text>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg, paddingBottom: space.xl },
  planBox: { gap: space.sm },
  planTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.dim },
  planItem: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  planEmpty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
});
