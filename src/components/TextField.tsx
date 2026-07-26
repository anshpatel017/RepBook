import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  /** Static, non-editable prefix — used for the +91 country code. */
  prefix?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, prefix, error, style, ...inputProps },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, Boolean(error) && styles.fieldError]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.dim}
          selectionColor={colors.accent}
          style={[styles.input, style]}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: space.xs },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: HIT_SLOP_MIN,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  fieldError: { borderColor: colors.danger },
  prefix: { fontFamily: fonts.bodyMed, fontSize: 16, color: colors.muted },
  input: {
    flex: 1,
    paddingVertical: space.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  error: { fontFamily: fonts.body, fontSize: 12, color: colors.danger },
});
