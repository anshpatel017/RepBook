import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

/** Settings row with a switch. */
export function SwitchRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.line, true: colors.accentDark }}
        thumbColor={value ? colors.accent : colors.dim}
      />
    </View>
  );
}

/** Settings row with two mutually exclusive choices (kg / lb). */
export function ChoiceRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label}: ${option.label}`}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: HIT_SLOP_MIN,
  },
  labels: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodyMed, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.dim },
  choices: {
    flexDirection: 'row',
    backgroundColor: colors.card2,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 2,
    gap: 2,
  },
  choice: {
    minWidth: 48,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    paddingHorizontal: space.sm,
  },
  choiceSelected: { backgroundColor: colors.accentDark },
  choiceLabel: { fontFamily: fonts.bodyMed, fontSize: 13, color: colors.muted },
  choiceLabelSelected: { color: colors.accent },
});
