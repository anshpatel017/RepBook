import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PlanTemplate } from '@/api/plan';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ErrorState, LoadingState, Screen } from '@/components/Screen';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useCreatePlan, useTemplates } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { DAYS, dayLong, type DayOfWeek } from '@/lib/days';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type PlanDraft = Map<DayOfWeek, string[]>;

/**
 * Member first run (wireframe 1c): pick training days (Mon–Sat, Sunday is always
 * rest), then build a plan by hand or from a template. Finishing writes the
 * exercises and flips profiles.onboarded, which releases the root router.
 */
export default function PlanSetupScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);

  const templates = useTemplates();
  const createPlan = useCreatePlan(userId);
  const updateProfile = useUpdateProfile(userId);

  const [draft, setDraft] = useState<PlanDraft>(new Map());
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selectedDays = useMemo(
    () => DAYS.filter(({ value }) => draft.has(value)).map(({ value }) => value),
    [draft],
  );

  const totalExercises = useMemo(
    () => [...draft.values()].reduce((sum, names) => sum + names.length, 0),
    [draft],
  );

  const toggleDay = useCallback((day: DayOfWeek) => {
    setDraft((previous) => {
      const next = new Map(previous);
      if (next.has(day)) next.delete(day);
      else next.set(day, []);
      return next;
    });
  }, []);

  const applyTemplate = useCallback((template: PlanTemplate) => {
    const next: PlanDraft = new Map();
    for (const exercise of template.exercises) {
      const day = exercise.day_of_week as DayOfWeek;
      const list = next.get(day);
      if (list) list.push(exercise.name);
      else next.set(day, [exercise.name]);
    }
    setDraft(next);
    setError(null);
  }, []);

  const addExercise = useCallback((day: DayOfWeek) => {
    const name = (drafts[day] ?? '').trim();
    if (!name) return;
    setDraft((previous) => {
      const next = new Map(previous);
      next.set(day, [...(next.get(day) ?? []), name]);
      return next;
    });
    setDrafts((previous) => ({ ...previous, [day]: '' }));
  }, [drafts]);

  const removeExercise = useCallback((day: DayOfWeek, index: number) => {
    setDraft((previous) => {
      const next = new Map(previous);
      const names = [...(next.get(day) ?? [])];
      names.splice(index, 1);
      next.set(day, names);
      return next;
    });
  }, []);

  const finish = useCallback(async () => {
    setError(null);

    const plan = selectedDays
      .map((day) => ({ day, names: draft.get(day) ?? [] }))
      .filter((entry) => entry.names.length > 0);

    if (plan.length === 0) {
      setError('Add at least one exercise to one day.');
      return;
    }

    try {
      await createPlan.mutateAsync(plan);
      await updateProfile.mutateAsync({ onboarded: true });
      // The root router moves us to Home once onboarded flips.
    } catch {
      setError('Could not save your plan. Check your connection and try again.');
    }
  }, [selectedDays, draft, createPlan, updateProfile]);

  const busy = createPlan.isPending || updateProfile.isPending;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <Text style={styles.title}>BUILD YOUR WEEK</Text>
            <Text style={styles.subtitle}>
              {profile?.display_name ? `${profile.display_name}, p` : 'P'}ick the days you train.
              Sunday is always a rest day.
            </Text>
          </View>

          <View style={styles.dayRow}>
            {DAYS.map(({ value, short }) => {
              const on = draft.has(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleDay(value)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={dayLong(value)}
                  style={[styles.dayToggle, on && styles.dayToggleOn]}
                >
                  <Text style={[styles.dayToggleLabel, on && styles.dayToggleLabelOn]}>{short}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.restCard}>
            <Text style={styles.restLabel}>Sunday · rest day</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>START FROM A TEMPLATE</Text>
            {templates.isLoading ? <LoadingState label="Loading templates…" /> : null}
            {templates.isError ? (
              <ErrorState
                message="Couldn't load templates. You can still build your plan by hand."
                onRetry={() => void templates.refetch()}
              />
            ) : null}
            <View style={styles.templateRow}>
              {(templates.data ?? []).map((template) => (
                <Pressable
                  key={template.id}
                  onPress={() => applyTemplate(template)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.template, pressed && styles.pressed]}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateMeta}>
                    {new Set(template.exercises.map((e) => e.day_of_week)).size} days ·{' '}
                    {template.exercises.length} exercises
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {selectedDays.length === 0 ? (
            <Text style={styles.hint}>Pick a day above, or start from a template.</Text>
          ) : (
            selectedDays.map((day) => (
              <View key={day} style={styles.dayCard}>
                <Text style={styles.dayCardTitle}>{dayLong(day)}</Text>

                {(draft.get(day) ?? []).map((name, index) => (
                  <View key={`${day}-${index}-${name}`} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {index + 1}. {name}
                    </Text>
                    <Pressable
                      onPress={() => removeExercise(day, index)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${name}`}
                      style={styles.removeButton}
                    >
                      <Icon name="x" size={16} color={colors.dim} />
                    </Pressable>
                  </View>
                ))}

                <View style={styles.addRow}>
                  <TextInput
                    value={drafts[day] ?? ''}
                    onChangeText={(text) => setDrafts((prev) => ({ ...prev, [day]: text }))}
                    onSubmitEditing={() => addExercise(day)}
                    placeholder="Add exercise…"
                    placeholderTextColor={colors.dim}
                    selectionColor={colors.accent}
                    maxLength={80}
                    accessibilityLabel={`Add an exercise to ${dayLong(day)}`}
                    style={styles.addInput}
                  />
                  <Pressable
                    onPress={() => addExercise(day)}
                    accessibilityRole="button"
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonLabel}>Add</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={totalExercises === 0 ? 'Add an exercise to continue' : 'Start tracking'}
            onPress={() => void finish()}
            loading={busy}
            disabled={totalExercises === 0 || busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: space.lg, paddingVertical: space.lg },
  intro: { gap: space.xs },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 1, color: colors.text },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  dayRow: { flexDirection: 'row', gap: space.sm },
  dayToggle: {
    flex: 1,
    minHeight: HIT_SLOP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  dayToggleOn: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  dayToggleLabel: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.muted },
  dayToggleLabelOn: { color: colors.accent },
  restCard: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
  },
  restLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.dim },
  section: { gap: space.sm },
  sectionTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
  },
  templateRow: { gap: space.sm },
  template: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: 2,
  },
  pressed: { opacity: 0.8 },
  templateName: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  templateMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  dayCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
  },
  dayCardTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.accent },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  exerciseName: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  removeGlyph: { fontFamily: fonts.body, fontSize: 14, color: colors.dim },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addInput: {
    flex: 1,
    minHeight: HIT_SLOP_MIN - 6,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    minHeight: HIT_SLOP_MIN - 6,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.input,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  addButtonLabel: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.accent },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
});
