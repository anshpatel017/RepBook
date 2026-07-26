import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LoggedSet } from '@/api/sets';
import { kgToDisplay, parseRepsInput, parseWeightInput, weightInputValue, type Unit } from '@/lib/units';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

const DEBOUNCE_MS = 500;

type SetRowProps = {
  /** Display number (1-based position), independent of the stored set_number. */
  index: number;
  set: LoggedSet;
  unit: Unit;
  /** Same set number last week, for the ghost line (FR-18). */
  ghost?: { weightKg: number | null; reps: number | null } | null;
  onSave: (setNumber: number, weightKg: number | null, reps: number | null) => void;
  onRemove: (set: LoggedSet) => void;
};

/**
 * One logged set. Local state is authoritative while typing (no re-render of the
 * list per keystroke, CLAUDE.md rule 15); writes are debounced 500ms and also
 * flushed on blur and on unmount so nothing is lost when leaving the screen.
 */
export const SetRow = memo(function SetRow({
  index,
  set,
  unit,
  ghost,
  onSave,
  onRemove,
}: SetRowProps) {
  const [weight, setWeight] = useState(() => weightInputValue(set.weight_kg, unit));
  const [reps, setReps] = useState(() => (set.reps === null ? '' : String(set.reps)));

  // Latest values/handler for the unmount flush, which can't read state directly.
  const latest = useRef({ weight, reps, onSave, setNumber: set.set_number, unit });
  latest.current = { weight, reps, onSave, setNumber: set.set_number, unit };

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    const current = latest.current;
    const weightKg = parseWeightInput(current.weight, current.unit);
    const reps = parseRepsInput(current.reps);

    // A set with both numbers filled in is a completed set: confirm it by feel,
    // so the lifter doesn't have to look at the screen to trust it saved.
    if (weightKg !== null && reps !== null && Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => {});
    }

    current.onSave(current.setNumber, weightKg, reps);
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  // Flush a pending edit when the row goes away (navigating back, app closing).
  useEffect(() => flush, [flush]);

  // Adopt server values when this row starts representing a different set.
  useEffect(() => {
    dirty.current = false;
    setWeight(weightInputValue(set.weight_kg, unit));
    setReps(set.reps === null ? '' : String(set.reps));
  }, [set.id, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const ghostLabel =
    ghost && (ghost.weightKg !== null || ghost.reps !== null)
      ? `last wk: ${ghost.weightKg === null ? '—' : kgToDisplay(ghost.weightKg, unit)} × ${ghost.reps ?? '—'}`
      : null;

  return (
    <View style={styles.rowWrapper}>
    <View style={styles.row}>
      <Text style={styles.index}>{index}</Text>

      <TextInput
        value={weight}
        onChangeText={(text) => {
          setWeight(text);
          schedule();
        }}
        onBlur={flush}
        placeholder="—"
        placeholderTextColor={colors.dim}
        keyboardType="decimal-pad"
        selectionColor={colors.accent}
        accessibilityLabel={`Set ${index} weight in ${unit}`}
        style={styles.input}
      />

      <TextInput
        value={reps}
        onChangeText={(text) => {
          setReps(text);
          schedule();
        }}
        onBlur={flush}
        placeholder="—"
        placeholderTextColor={colors.dim}
        keyboardType="number-pad"
        selectionColor={colors.accent}
        accessibilityLabel={`Set ${index} reps`}
        style={styles.input}
      />

      <Pressable
        onPress={() => {
          flush();
          onRemove(set);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Remove set ${index}`}
        style={styles.remove}
      >
        <Text style={styles.removeGlyph}>✕</Text>
      </Pressable>
    </View>

      {ghostLabel ? <Text style={styles.ghost}>{ghostLabel}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  rowWrapper: { gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  ghost: {
    marginLeft: 28 + space.sm,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dim,
  },
  index: {
    width: 28,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.muted,
  },
  input: {
    flex: 1,
    minHeight: HIT_SLOP_MIN - 6,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  remove: {
    width: 32,
    height: HIT_SLOP_MIN - 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: { fontFamily: fonts.body, fontSize: 15, color: colors.dim },
});
