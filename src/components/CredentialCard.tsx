import * as Clipboard from 'expo-clipboard';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

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
 * Generated credentials, displayed EXACTLY once. The password is the largest
 * thing on the screen (display-scale, lime) and Copy is the primary action —
 * this must look like something you copy immediately, not dismiss.
 * Nothing here is persisted or logged.
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
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to the generic share sheet
    }
    if (Platform.OS !== 'web') await Share.share({ message });
  }, [message, whatsappTo]);

  return (
    <View style={styles.outer}>
      <View style={styles.titleRow}>
        <View style={styles.tick}>
          <Icon name="check" size={14} color={colors.accentDark} />
        </View>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.block}>
          <Text style={styles.label}>{identifierLabel}</Text>
          <Text style={styles.identifier} selectable>
            {identifierLabel === 'Phone' ? formatPhone(identifier) : identifier}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.block}>
          <Text style={styles.label}>Temporary password</Text>
          <Text style={styles.password} selectable>
            {password}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => void copy()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
          >
            <Icon name={copied ? 'check' : 'copy'} size={17} color={colors.accentDark} />
            <Text style={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
          {whatsappTo ? (
            <Pressable
              onPress={() => void shareToWhatsApp()}
              accessibilityRole="button"
              accessibilityLabel="Send on WhatsApp"
              style={({ pressed }) => [styles.share, pressed && styles.pressed]}
            >
              <Icon name="message-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.warning}>
          <Icon name="alert-triangle" size={15} color={colors.warn} />
          <Text style={styles.warningLabel}>
            Shown only once. Share it now — they set their own password on first sign-in.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.display3, fontSize: 26, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: space.lg + 2,
    gap: space.lg,
  },
  block: { gap: 4 },
  label: { ...type.label, fontSize: 11, letterSpacing: 1.2, color: colors.dim },
  identifier: { ...type.display3, fontSize: 26, letterSpacing: 1, color: colors.text },
  password: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: 3,
    color: colors.accent,
  },
  divider: { height: 1, backgroundColor: colors.line },
  actions: { flexDirection: 'row', gap: space.sm },
  copy: {
    flex: 1,
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  copyLabel: { ...type.bodyMed, color: colors.accentDark },
  share: {
    width: 52,
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  warning: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  warningLabel: { ...type.bodySm, flex: 1, fontSize: 12, color: colors.warn },
});
