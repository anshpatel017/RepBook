import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { LoggedSet } from '@/api/sets';
import { Icon } from '@/components/Icon';
import {
  kgToDisplay,
  parseRepsInput,
  parseWeightInput,
  weightInputValue,
  type Unit,
} from '@/lib/units';
import { colors, fonts, radius, space, type, CONTROL } from '@/theme/tokens';

const DEBOUNCE_MS = 500;

type SetRowProps = {
  /** Display number (1-based position), independent of the stored set_number. */
  index: number;
  set: LoggedSet;
  unit: Unit;
  /** Same set number last week, for the delta chip and the target hint (FR-18). */
  ghost?: { weightKg: number | null; reps: number | null } | null;
  onSave: (setNumber: number, weightKg: number | null, reps: number | null) => void;
  onRemove: (set: LoggedSet) => void;
};

/**
 * One logged set, at two densities:
 *   done + unfocused → 44pt summary row "65 kg × 12" + delta chip + check
 *   focused or empty → 60pt fields, lime ring, "Beat last week: 70 × 8"
 * The ghost line is gone: last week's numbers live in the delta chip and the
 * hint, which is what killed the cramped two-line row on a 360px phone.
 *
 * Save behaviour is unchanged: local state is authoritative while typing, writes
 * are debounced 500ms and flushed on blur and on unmount.
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
  const [focused, setFocused] = useState(false);

  const weightRef = useRef<TextInput>(null);

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
    const parsedReps = parseRepsInput(current.reps);

    // A set with both numbers filled in is a completed set: confirm it by feel,
    // so the lifter doesn't have to look at the screen to trust it saved.
    if (weightKg !== null && parsedReps !== null && Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => {});
    }

    current.onSave(current.setNumber, weightKg, parsedReps);
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

  const complete = weight.trim() !== '' && reps.trim() !== '';
  const expanded = focused || !complete;

  const lastWeight = ghost?.weightKg == null ? null : kgToDisplay(ghost.weightKg, unit);
  const thisWeight = parseWeightInput(weight, unit);
  const delta =
    thisWeight !== null && ghost?.weightKg != null
      ? Math.round((kgToDisplay(thisWeight, unit) - kgToDisplay(ghost.weightKg, unit)) * 10) / 10
      : null;

  const hint =
    lastWeight === null
      ? 'First time on this set'
      : `Beat last week: ${lastWeight} × ${ghost?.reps ?? '—'}`;

  if (!expanded) {
    return (
      <Pressable
        onPress={() => {
          setFocused(true);
          requestAnimationFrame(() => weightRef.current?.focus());
        }}
        accessibilityRole="button"
        accessibilityLabel={`Set ${index}, ${weight} ${unit} by ${reps} reps. Edit.`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <Text style={styles.summaryIndex}>{index}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {weight} <Text style={styles.summaryUnit}>{unit}</Text> × {reps}
        </Text>
        {delta !== null ? (
          <View style={delta > 0 ? styles.chipUp : styles.chipFlat}>
            <Text style={delta > 0 ? styles.chipUpLabel : styles.chipFlatLabel}>
              {delta > 0 ? `+${delta} ${unit}` : delta < 0 ? `${delta} ${unit}` : 'same'}
            </Text>
          </View>
        ) : null}
        <Icon name="check" size={16} color={colors.accent} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, focused && styles.cardFocused]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>Set {index}</Text>
        <Text style={styles.cardHint} numberOfLines={1}>
          {hint}
        </Text>
      </View>

      <View style={styles.fields}>
        <View style={styles.field}>
          <TextInput
            ref={weightRef}
            value={weight}
            onChangeText={(text) => {
              setWeight(text);
              schedule();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              flush();
            }}
            placeholder="—"
            placeholderTextColor={colors.dim}
            keyboardType="decimal-pad"
            selectionColor={colors.accent}
            accessibilityLabel={`Set ${index} weight in ${unit}`}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>{unit}</Text>
        </View>

        <Text style={styles.times}>×</Text>

        <View style={styles.field}>
          <TextInput
            value={reps}
            onChangeText={(text) => {
              setReps(text);
              schedule();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              flush();
            }}
            placeholder="—"
            placeholderTextColor={colors.dim}
            keyboardType="number-pad"
            selectionColor={colors.accent}
            accessibilityLabel={`Set ${index} reps`}
            style={styles.input}
          />
          <Text style={styles.fieldLabel}>reps</Text>
        </View>

        <Pressable
          onPress={() => {
            flush();
            onRemove(set);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove set ${index}`}
          style={styles.remove}
        >
          <Icon name="x" size={18} color={colors.dim} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  summary: {
    minHeight: CONTROL.row,
    backgroundColor: colors.card2,
    borderRadius: radius.row,
    paddingHorizontal: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
  },
  pressed: { opacity: 0.85 },
  summaryIndex: { ...type.num2, fontSize: 16, width: 18, color: colors.dim },
  summaryValue: { ...type.num2, flex: 1, color: colors.text },
  summaryUnit: { ...type.bodySm, color: colors.dim },
  chipUp: {
    height: 22,
    paddingHorizontal: space.sm,
    borderRadius: radius.chip,
    backgroundColor: colors.accentDark,
    justifyContent: 'center',
  },
  chipUpLabel: { ...type.micro, fontFamily: fonts.bodyMed, color: colors.accent },
  chipFlat: {
    height: 22,
    paddingHorizontal: space.sm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  chipFlatLabel: { ...type.micro, fontFamily: fonts.bodyMed, color: colors.dim },
  card: {
    backgroundColor: colors.card2,
    borderRadius: radius.input,
    padding: space.md,
    gap: space.sm,
  },
  cardFocused: { borderWidth: 1.5, borderColor: colors.accent, padding: space.md - 1.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardLabel: { ...type.label, fontSize: 11, color: colors.accent },
  cardHint: { ...type.bodySm, flex: 1, fontSize: 12, color: colors.muted },
  fields: { flexDirection: 'row', alignItems: 'stretch', gap: space.sm },
  field: {
    flex: 1,
    height: CONTROL.activeField,
    backgroundColor: colors.bg,
    borderRadius: radius.row,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: colors.text,
    padding: 0,
  },
  fieldLabel: { ...type.label, fontSize: 10, color: colors.dim },
  times: { ...type.num2, width: 20, textAlign: 'center', alignSelf: 'center', color: colors.dim },
  remove: { width: 44, alignItems: 'center', justifyContent: 'center' },
});
