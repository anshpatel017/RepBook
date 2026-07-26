import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { nextSetNumber, useDayHistory, useDayLog } from '@/hooks/useDayLog';
import { useProfile } from '@/hooks/useProfile';
import { useAddExercise, useArchiveExercise, useRenameExercise } from '@/hooks/usePlan';
import { useSession } from '@/hooks/useSession';
import { useShowGhosts } from '@/stores/ui';
import { dayLong, parseDay, parseWeek } from '@/lib/days';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

/**
 * THE core screen (wireframe screen 4). No save button anywhere: every edit
 * auto-saves through useDayLog with optimistic updates and rollback.
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

  const entries = useMemo(() => log.data ?? [], [log.data]);
  const exerciseIds = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const history = useDayHistory(day ?? 1, week ?? 1, exerciseIds);

  const handleSaveSet = useCallback(
    (exerciseId: string, setNumber: number, weightKg: number | null, reps: number | null) => {
      setSaveError(null);
      log.save.mutate(
        { exerciseId, setNumber, weightKg, reps },
        { onError: () => setSaveError("Couldn't save that set — check your connection.") },
      );
    },
    [log.save],
  );

  const handleAddSet = useCallback(
    (entry: DayLogEntry) => {
      const setNumber = nextSetNumber(entry.sets);
      if (setNumber === null) {
        setSaveError('20 sets is the limit for one exercise.');
        return;
      }
      setSaveError(null);
      log.save.mutate(
        { exerciseId: entry.id, setNumber, weightKg: null, reps: null },
        { onError: () => setSaveError("Couldn't add that set — check your connection.") },
      );
    },
    [log.save],
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
      log.removeSet.mutate(
        { exerciseId, setId: set.id },
        { onError: () => setSaveError("Couldn't remove that set — check your connection.") },
      );
    },
    [log.removeSet],
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
      <ScreenHeader title={dayLong(day)} subtitle={`Week ${week}`} back />

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
              <EmptyState title="No exercises yet" hint="Add your first one 👇" />
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
            ListFooterComponent={
              <View style={styles.addRow}>
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
                  disabled={addExercise.isPending}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Text style={styles.addButtonLabel}>Add</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { gap: space.md, paddingBottom: space.xxl },
  saveError: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, paddingBottom: space.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md },
  addInput: {
    flex: 1,
    minHeight: HIT_SLOP_MIN,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  addButton: {
    minHeight: HIT_SLOP_MIN,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
  },
  pressed: { opacity: 0.9 },
  addButtonLabel: { fontFamily: fonts.bodyMed, fontSize: 15, color: colors.accentDark },
});
