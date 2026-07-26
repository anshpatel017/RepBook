import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type CredentialCardProps = {
  title?: string;
  /** Phone for members, email for gym admins. */
  identifierLabel: string;
  identifier: string;
  password: string;
  /** E.164 phone to open WhatsApp with, when there is one. */
  whatsappTo?: string | null;
};

/**
 * Generated credentials, displayed EXACTLY once (CLAUDE.md rule 6).
 * Nothing here is persisted or logged — the values live in the caller's state
 * until the screen is dismissed.
 */
export function CredentialCard({
  title = 'Account created',
  identifierLabel,
  identifier,
  password,
  whatsappTo,
}: CredentialCardProps) {
  const [copied, setCopied] = useState(false);

  const message = `RepBook login\n${identifierLabel}: ${identifier}\nPassword: ${password}\n\nYou'll set your own password on first sign-in.`;

  const copy = useCallback(async () => {
    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  const shareToWhatsApp = useCallback(async () => {
    const digits = (whatsappTo ?? '').replace(/\D/g, '');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    try {
      const opened = await Linking.canOpenURL(url);
      if (opened) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to the generic share sheet
    }
    if (Platform.OS !== 'web') await Share.share({ message });
  }, [message, whatsappTo]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>✅ {title}</Text>

      <View style={styles.rows}>
        <Row label={identifierLabel} value={identifierLabel === 'Phone' ? formatPhone(identifier) : identifier} />
        <Row label="Password" value={password} mono />
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void copy()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
        </Pressable>
        <Pressable
          onPress={() => void shareToWhatsApp()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, styles.actionPrimary, pressed && styles.pressed]}
        >
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>🟢 WhatsApp</Text>
        </Pressable>
      </View>

      <Text style={styles.warning}>
        ⚠ Shown only once. Share it now — they set their own password on first sign-in.
      </Text>
    </View>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.rowValueMono]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  rows: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  rowValue: { flex: 1, textAlign: 'right', fontFamily: fonts.bodyMed, fontSize: 15, color: colors.text },
  rowValueMono: { fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: colors.accent },
  actions: { flexDirection: 'row', gap: space.sm },
  action: {
    flex: 1,
    minHeight: HIT_SLOP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card2,
  },
  actionPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  pressed: { opacity: 0.85 },
  actionLabel: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
  actionLabelPrimary: { color: colors.accentDark },
  warning: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted },
});
