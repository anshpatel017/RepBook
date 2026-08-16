import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { DayLogEntry, LoggedSet } from '@/api/sets';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Icon } from '@/components/Icon';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { nextSetNumber, useDayHistory, useDayLog } from '@/hooks/useDayLog';
import { useProfile } from '@/hooks/useProfile';
import { useAddExercise, useArchiveExercise, useRenameExercise } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { dayLong, parseDay, parseWeek } from '@/lib/days';
import { useShowGhosts } from '@/stores/ui';
import { colors, radius, space, type } from '@/theme/tokens';

/**
 * THE core screen. No save button anywhere: every edit auto-saves through
 * useDayLog with optimistic updates and rollback. The only feedback is a
 * two-word status in the header — trustworthy, and it never shifts layout.
 */
export default function LogScreen() {
  const params = useLocalSearchParams<{ day?: string; week?: string }>();
  const day = parseDay(params.day);
  const week = parseWeek(params.week);

  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const unit = profile?.unit ?? 'kg';

  const log = useDayLog(userId, day ?? 1, week ?? 1);
  const showGhosts = useShowGhosts();
  const addExercise = useAddExercise(userId);
  const renameExercise = useRenameExercise(userId);
  const archiveExercise = useArchiveExercise(userId);

  const [newName, setNewName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    setSaving(true);
    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => setSaving(false), 700);
  }, []);

  useEffect(
    () => () => {
      if (savingTimer.current) clearTimeout(savingTimer.current);
    },
    [],
  );

  const entries = useMemo(() => log.data ?? [], [log.data]);
  const exerciseIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const history = useDayHistory(day ?? 1, week ?? 1, exerciseIds);

  const handleSaveSet = useCallback(
    (exerciseId: string, setNumber: number, weightKg: number | null, reps: number | null) => {
      setSaveError(null);
      markSaving();
      log.save.mutate(
        { exerciseId, setNumber, weightKg, reps },
        { onError: () => setSaveError("Couldn't save that set — check your connection.") },
      );
    },
    [log.save, markSaving],
  );

  const handleAddSet = useCallback(
    (entry: DayLogEntry) => {
      const setNumber = nextSetNumber(entry.sets);
      if (setNumber === null) {
        setSaveError('20 sets is the limit for one exercise.');
        return;
      }
      setSaveError(null);
      markSaving();
      log.save.mutate(
        { exerciseId: entry.id, setNumber, weightKg: null, reps: null },
        { onError: () => setSaveError("Couldn't add that set — check your connection.") },
      );
    },
    [log.save, markSaving],
  );

  const handleRemoveSet = useCallback(
    (exerciseId: string, set: LoggedSet) => {
      // The row still holds an optimistic id — deleting it would hit nothing and
      // the real row would reappear on the next refetch.
      if (set.id.startsWith('optimistic-')) {
        setSaveError('Still saving that set — try again in a second.');
        return;
      }
      setSaveError(null);
      markSaving();
      log.removeSet.mutate(
        { exerciseId, setId: set.id },
        { onError: () => setSaveError("Couldn't remove that set — check your connection.") },
      );
    },
    [log.removeSet, markSaving],
  );

  const handleRename = useCallback(
    (exerciseId: string, name: string) => {
      renameExercise.mutate({ exerciseId, name });
    },
    [renameExercise],
  );

  const handleDelete = useCallback(
    (exerciseId: string) => {
      archiveExercise.mutate(exerciseId);
    },
    [archiveExercise],
  );

  const handleAddExercise = useCallback(() => {
    const name = newName.trim();
    if (!name || !day) return;
    setNewName('');
    addExercise.mutate({ day, name, position: entries.length });
  }, [newName, day, entries.length, addExercise]);

  if (!day || !week) {
    return (
      <Screen center>
        <EmptyState
          title="That workout doesn't exist"
          hint="Days run Monday to Saturday and weeks start at 1."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={dayLong(day).toUpperCase()}
        back
        right={
          <View style={styles.headerRight}>
            <View style={styles.weekChip}>
              <Text style={styles.weekChipLabel}>WEEK {week}</Text>
            </View>
            <View style={styles.status}>
              {saving ? (
                <>
                  <View style={styles.savingDot} />
                  <Text style={styles.savingLabel}>Saving</Text>
                </>
              ) : (
                <>
                  <Icon name="check" size={14} color={colors.dim} />
                  <Text style={styles.savedLabel}>Saved</Text>
                </>
              )}
            </View>
          </View>
        }
      />

      {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {log.isLoading ? (
          <LoadingState />
        ) : log.isError ? (
          <ErrorState
            message="Couldn't load this workout. Check your connection and try again."
            onRetry={() => void log.refetch()}
          />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState title="No exercises yet" hint="Add your first one below." />
            }
            renderItem={({ item }) => (
              <ExerciseCard
                entry={item}
                unit={unit}
                history={showGhosts ? (history.data ?? null) : null}
                onSaveSet={handleSaveSet}
                onAddSet={handleAddSet}
                onRemoveSet={handleRemoveSet}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            )}
          />
        )}

        <View style={styles.footer}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAddExercise}
            placeholder="Add exercise…"
            placeholderTextColor={colors.dim}
            selectionColor={colors.accent}
            maxLength={80}
            accessibilityLabel="New exercise name"
            style={styles.addInput}
          />
          <Pressable
            onPress={handleAddExercise}
            accessibilityRole="button"
            accessibilityLabel="Add exercise"
            disabled={addExercise.isPending}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          >
            <Icon name="plus" size={22} color={colors.accentDark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { gap: 14, paddingBottom: space.xl },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  weekChip: {
    height: 30,
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  weekChipLabel: { ...type.label, fontSize: 12, letterSpacing: 0.6, color: colors.muted },
  status: { width: 56, flexDirection: 'row', alignItems: 'center', gap: 4 },
  savingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  savingLabel: { ...type.micro, color: colors.accent },
  savedLabel: { ...type.micro, color: colors.dim },
  saveError: { ...type.bodySm, color: colors.danger, paddingBottom: space.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  addInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.card2,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    ...type.body,
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9 },
});
