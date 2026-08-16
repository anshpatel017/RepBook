import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, fonts, radius, space, type, HIT_SLOP_MIN } from '@/theme/tokens';

type Option<T extends string | number> = { value: T; label: string };

type PickerProps<T extends string | number> = {
  label: string;
  value: T | undefined;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
};

/** Compact dropdown used by Charts. Square-ish trigger, chevron icon. */
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
        <Text style={styles.triggerLabel}>{label}</Text>
        <Text style={styles.triggerValue} numberOfLines={1}>
          {selected?.label ?? '—'}
        </Text>
        <Icon name="chevron-down" size={15} color={colors.dim} />
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
                    {isSelected ? <Icon name="check" size={16} color={colors.accent} /> : null}
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
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radius.row,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.8 },
  triggerLabel: { ...type.bodySm, fontSize: 12, color: colors.dim },
  triggerValue: { ...type.bodyMed, flex: 1, fontSize: 13, color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
    padding: space.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space.md,
    gap: space.sm,
    maxHeight: '70%',
  },
  sheetTitle: { ...type.label, fontSize: 11, color: colors.dim },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: HIT_SLOP_MIN,
    paddingHorizontal: space.sm,
  },
  optionLabel: { ...type.body, flex: 1, color: colors.text },
  optionLabelSelected: { fontFamily: fonts.bodyMed, color: colors.accent },
});
