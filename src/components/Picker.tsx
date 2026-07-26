import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type Option<T extends string | number> = { value: T; label: string };

type PickerProps<T extends string | number> = {
  label: string;
  value: T | undefined;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
};

/**
 * Compact dropdown ("Day: Monday ▾", "Week 1 ▾") used by the Charts screen.
 * A Modal list rather than a native picker so it looks identical on both
 * platforms and stays inside the dark token set.
 */
export function Picker<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: PickerProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'none'}`}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {label}: <Text style={styles.triggerValue}>{selected?.label ?? '—'}</Text> ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    {isSelected ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    minHeight: HIT_SLOP_MIN - 6,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.8 },
  triggerLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  triggerValue: { fontFamily: fonts.bodyMed, color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dim,
  },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT_SLOP_MIN,
    paddingHorizontal: space.sm,
  },
  optionLabel: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  optionLabelSelected: { fontFamily: fonts.bodyMed, color: colors.accent },
  check: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.accent },
});
