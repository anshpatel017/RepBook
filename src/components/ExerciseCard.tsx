import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DayHistory, DayLogEntry, LoggedSet } from '@/api/sets';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SetRow } from '@/components/SetRow';
import { kgToDisplay, type Unit } from '@/lib/units';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type ExerciseCardProps = {
  entry: DayLogEntry;
  unit: Unit;
  /** Last week's sets + the pre-week best, for ghosts and the PR chip (FR-18). */
  history?: DayHistory | null;
  onSaveSet: (exerciseId: string, setNumber: number, weightKg: number | null, reps: number | null) => void;
  onAddSet: (entry: DayLogEntry) => void;
  onRemoveSet: (exerciseId: string, set: LoggedSet) => void;
  onRename: (exerciseId: string, name: string) => void;
  onDelete: (exerciseId: string) => void;
};

/** One exercise on the log screen (wireframe screen 4). */
export const ExerciseCard = memo(function ExerciseCard({
  entry,
  unit,
  history,
  onSaveSet,
  onAddSet,
  onRemoveSet,
  onRename,
  onDelete,
}: ExerciseCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(entry.name);
  const [confirming, setConfirming] = useState(false);

  const saveSet = useCallback(
    (setNumber: number, weightKg: number | null, reps: number | null) =>
      onSaveSet(entry.id, setNumber, weightKg, reps),
    [entry.id, onSaveSet],
  );

  const removeSet = useCallback((set: LoggedSet) => onRemoveSet(entry.id, set), [entry.id, onRemoveSet]);

  const commitRename = useCallback(() => {
    const trimmed = draftName.trim();
    setRenaming(false);
    if (!trimmed || trimmed === entry.name) {
      setDraftName(entry.name);
      return;
    }
    onRename(entry.id, trimmed);
  }, [draftName, entry.id, entry.name, onRename]);

  const bestThisWeek = entry.sets.reduce<number | null>(
    (best, set) => (set.weight_kg !== null && (best === null || set.weight_kg > best) ? set.weight_kg : best),
    null,
  );
  const bestBefore = history?.bestBefore[entry.id];
  const prGain =
    bestThisWeek !== null && bestBefore !== undefined && bestThisWeek > bestBefore
      ? kgToDisplay(bestThisWeek, unit) - kgToDisplay(bestBefore, unit)
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {renaming ? (
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            onSubmitEditing={commitRename}
            onBlur={commitRename}
            autoFocus
            selectTextOnFocus
            maxLength={80}
            selectionColor={colors.accent}
            accessibilityLabel="Exercise name"
            style={styles.nameInput}
          />
        ) : (
          <Text style={styles.name} numberOfLines={2}>
            {entry.name}
          </Text>
        )}

        <Pressable
          onPress={() => (renaming ? commitRename() : setRenaming(true))}
          accessibilityRole="button"
          accessibilityLabel={renaming ? 'Save name' : `Rename ${entry.name}`}
          style={styles.iconButton}
        >
          <Text style={styles.icon}>{renaming ? '✓' : '✏️'}</Text>
        </Pressable>

        <Pressable
          onPress={() => setConfirming(true)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${entry.name}`}
          style={styles.iconButton}
        >
          <Text style={styles.icon}>🗑</Text>
        </Pressable>
      </View>

      {prGain !== null ? (
        <View style={styles.prChip}>
          <Text style={styles.prLabel}>
            🔥 PR +{Math.round(prGain * 10) / 10} {unit}
          </Text>
        </View>
      ) : null}

      <View style={styles.columns}>
        <Text style={[styles.columnLabel, styles.columnSet]}>SET</Text>
        <Text style={styles.columnLabel}>WEIGHT ({unit})</Text>
        <Text style={styles.columnLabel}>REPS</Text>
        <View style={styles.columnSpacer} />
      </View>

      {entry.sets.length === 0 ? (
        <Text style={styles.noSets}>No sets yet — add your first below.</Text>
      ) : (
        entry.sets.map((set, index) => (
          <SetRow
            key={set.id}
            index={index + 1}
            set={set}
            unit={unit}
            ghost={history?.lastWeek[`${entry.id}:${set.set_number}`] ?? null}
            onSave={saveSet}
            onRemove={removeSet}
          />
        ))
      )}

      <Pressable
        onPress={() => onAddSet(entry)}
        accessibilityRole="button"
        accessibilityLabel={`Add a set to ${entry.name}`}
        style={styles.addSet}
      >
        <Text style={styles.addSetLabel}>＋ Add set</Text>
      </Pressable>

      <ConfirmDialog
        visible={confirming}
        title={`Delete ${entry.name}?`}
        message="It disappears from your plan. Sets you already logged stay in your history and charts."
        confirmLabel="Delete exercise"
        destructive
        onConfirm={() => {
          setConfirming(false);
          onDelete(entry.id);
        }}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 21, color: colors.text },
  nameInput: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
  },
  iconButton: {
    width: HIT_SLOP_MIN - 8,
    height: HIT_SLOP_MIN - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 15 },
  prChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 3,
    borderRadius: radius.chip,
    backgroundColor: colors.accentDark,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  prLabel: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.accent },
  columns: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  columnLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.dim,
  },
  columnSet: { flex: 0, width: 28 },
  columnSpacer: { width: 32 },
  noSets: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, paddingVertical: space.xs },
  addSet: { minHeight: HIT_SLOP_MIN - 8, justifyContent: 'center' },
  addSetLabel: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.accent },
});
