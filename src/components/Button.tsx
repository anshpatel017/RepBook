import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { colors, radius, space, type, CONTROL } from '@/theme/tokens';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
};

/**
 * primary  — solid lime, condensed uppercase label. One per screen.
 * secondary— card2 fill, no border.
 * danger   — hairline red outline, sits apart from everything else.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
}: ButtonProps) {
  const inactive = disabled || loading;
  const tint =
    variant === 'primary' ? colors.accentDark : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={tint} /> : null}
        {!loading && icon ? <Icon name={icon} size={18} color={tint} /> : null}
        <Text style={[variant === 'primary' ? styles.labelPrimary : styles.label, { color: tint }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: CONTROL.cta,
    borderRadius: radius.input,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.card2 },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { ...type.bodyMed, textAlign: 'center' },
  labelPrimary: { ...type.display3, letterSpacing: 1, textAlign: 'center' },
});
