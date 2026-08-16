import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, space, type, CONTROL } from '@/theme/tokens';

type TextFieldProps = TextInputProps & {
  label: string;
  /** Static, non-editable prefix — used for the +91 country code. */
  prefix?: string;
  error?: string;
  hint?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, prefix, error, hint, style, ...inputProps },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, Boolean(error) && styles.fieldError]}>
        {prefix ? (
          <>
            <Text style={styles.prefix}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </>
        ) : null}
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
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { ...type.label, color: colors.dim },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: CONTROL.field,
    backgroundColor: colors.card2,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    gap: space.sm + 2,
  },
  fieldError: { borderWidth: 1.5, borderColor: colors.danger, paddingHorizontal: 12.5 },
  prefix: { ...type.bodyMed, fontSize: 15, color: colors.dim },
  prefixDivider: { width: 1, height: 22, backgroundColor: colors.line },
  input: { flex: 1, ...type.body, fontSize: 16, color: colors.text, paddingVertical: space.md },
  error: { ...type.bodySm, fontSize: 12, color: colors.danger },
  hint: { ...type.micro, color: colors.dim },
});
