import { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DayHistory, DayLogEntry, LoggedSet } from '@/api/sets';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Icon } from '@/components/Icon';
import { PRBanner } from '@/components/PRBanner';
import { SetRow } from '@/components/SetRow';
import { kgToDisplay, type Unit } from '@/lib/units';
import { colors, fonts, radius, space, type, CONTROL } from '@/theme/tokens';

type ExerciseCardProps = {
  entry: DayLogEntry;
  unit: Unit;
  /** Last week's sets + the pre-week best, for delta chips and the PR banner. */
  history?: DayHistory | null;
  onSaveSet: (
    exerciseId: string,
    setNumber: number,
    weightKg: number | null,
    reps: number | null,
  ) => void;
  onAddSet: (entry: DayLogEntry) => void;
  onRemoveSet: (exerciseId: string, set: LoggedSet) => void;
  onRename: (exerciseId: string, name: string) => void;
  onDelete: (exerciseId: string) => void;
};

/** One exercise on the log screen. The PR is a banner now, not a chip. */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const saveSet = useCallback(
    (setNumber: number, weightKg: number | null, reps: number | null) =>
      onSaveSet(entry.id, setNumber, weightKg, reps),
    [entry.id, onSaveSet],
  );

  const removeSet = useCallback(
    (set: LoggedSet) => onRemoveSet(entry.id, set),
    [entry.id, onRemoveSet],
  );

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
    (best, set) =>
      set.weight_kg !== null && (best === null || set.weight_kg > best) ? set.weight_kg : best,
    null,
  );
  const bestBefore = history?.bestBefore[entry.id];
  const prGain =
    bestThisWeek !== null && bestBefore !== undefined && bestThisWeek > bestBefore
      ? kgToDisplay(bestThisWeek, unit) - kgToDisplay(bestBefore, unit)
      : null;

  return (
    <View style={styles.wrapper}>
      {prGain !== null && bestThisWeek !== null ? (
        <PRBanner
          exercise={entry.name}
          best={kgToDisplay(bestThisWeek, unit)}
          gain={prGain}
          unit={unit}
        />
      ) : null}

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
            <View style={styles.titles}>
              <Text style={styles.name} numberOfLines={2}>
                {entry.name}
              </Text>
              <Text style={styles.meta}>
                {bestBefore === undefined
                  ? 'No history yet'
                  : `Last week best ${kgToDisplay(bestBefore, unit)} ${unit}`}
                {' · '}
                {entry.sets.length} {entry.sets.length === 1 ? 'set' : 'sets'}
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => (renaming ? commitRename() : setMenuOpen((open) => !open))}
            accessibilityRole="button"
            accessibilityLabel={renaming ? 'Save name' : `Options for ${entry.name}`}
            style={styles.iconButton}
          >
            <Icon
              name={renaming ? 'check' : 'more-vertical'}
              size={18}
              color={renaming ? colors.accent : colors.dim}
            />
          </Pressable>
        </View>

        {menuOpen && !renaming ? (
          <View style={styles.menu}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
              accessibilityRole="button"
              style={styles.menuItem}
            >
              <Icon name="edit-2" size={16} color={colors.text} />
              <Text style={styles.menuLabel}>Rename</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                setConfirming(true);
              }}
              accessibilityRole="button"
              style={styles.menuItem}
            >
              <Icon name="trash-2" size={16} color={colors.danger} />
              <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Delete exercise</Text>
            </Pressable>
          </View>
        ) : null}

        {entry.sets.length === 0 ? (
          <Text style={styles.noSets}>No sets yet — add your first below.</Text>
        ) : (
          <View style={styles.sets}>
            {entry.sets.map((set, index) => (
              <SetRow
                key={set.id}
                index={index + 1}
                set={set}
                unit={unit}
                ghost={history?.lastWeek[`${entry.id}:${set.set_number}`] ?? null}
                onSave={saveSet}
                onRemove={removeSet}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={() => onAddSet(entry)}
          accessibilityRole="button"
          accessibilityLabel={`Add a set to ${entry.name}`}
          style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}
        >
          <Icon name="plus" size={16} color={colors.accent} />
          <Text style={styles.addSetLabel}>Add set</Text>
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
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: space.md - 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 14, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  titles: { flex: 1, gap: 2 },
  name: { ...type.display3, fontSize: 24, lineHeight: 26, color: colors.text },
  meta: { ...type.bodySm, fontSize: 12, color: colors.dim },
  nameInput: {
    flex: 1,
    ...type.display3,
    fontSize: 24,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    marginTop: -6,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: { backgroundColor: colors.card2, borderRadius: radius.row, overflow: 'hidden' },
  menuItem: {
    minHeight: CONTROL.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 14,
  },
  menuDivider: { height: 1, backgroundColor: colors.line, marginLeft: 14 },
  menuLabel: { ...type.bodySm, fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
  menuLabelDanger: { color: colors.danger },
  sets: { gap: 6 },
  noSets: { ...type.bodySm, color: colors.dim },
  addSet: {
    minHeight: CONTROL.row,
    borderRadius: radius.row,
    backgroundColor: colors.card2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.85 },
  addSetLabel: { ...type.bodyMed, fontSize: 14, color: colors.accent },
});
