import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { colors, radius, space, type } from '@/theme/tokens';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Destructive actions always confirm. Cancel sits on the left at equal weight;
 * a delete prompt gets no flourish beyond the 180ms fade+scale in the spec.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.badge, destructive ? styles.badgeDanger : styles.badgeAccent]}>
            <Icon
              name={destructive ? 'alert-triangle' : 'check'}
              size={20}
              color={destructive ? colors.danger : colors.accent}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.action, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                destructive ? styles.confirmDanger : styles.confirmPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={destructive ? styles.confirmDangerLabel : styles.confirmPrimaryLabel}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', padding: space.xl },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: space.xl, gap: space.md },
  badge: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeDanger: { backgroundColor: colors.dangerDark },
  badgeAccent: { backgroundColor: colors.accentDark },
  title: { ...type.display3, fontSize: 26, lineHeight: 28, color: colors.text },
  message: { ...type.bodySm, fontSize: 14, lineHeight: 20, color: colors.muted },
  actions: { flexDirection: 'row', gap: space.sm, paddingTop: space.xs },
  action: {
    flex: 1,
    height: 48,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  cancel: { backgroundColor: colors.card2 },
  cancelLabel: { ...type.bodyMed, color: colors.text },
  confirmPrimary: { backgroundColor: colors.accent },
  confirmPrimaryLabel: { ...type.bodyMed, color: colors.accentDark },
  confirmDanger: { backgroundColor: colors.danger },
  confirmDangerLabel: { ...type.bodyMed, color: colors.dangerDark },
});
