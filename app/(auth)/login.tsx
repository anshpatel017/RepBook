import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AUTH_MESSAGES,
  friendlyAuthMessage,
  signInWithEmail,
  signInWithPhone,
  signOut,
} from '@/api/auth';
import { fetchProfile } from '@/api/profile';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { profileKey } from '@/hooks/useProfile';
import { DEFAULT_COUNTRY_CODE, localDigits, normalizePhone } from '@/lib/phone';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Mode = 'member' | 'admin';

const MODES = [
  { value: 'member' as const, label: 'Member' },
  { value: 'admin' as const, label: 'Admin' },
];

export default function LoginScreen() {
  const queryClient = useQueryClient();
  const passwordRef = useRef<TextInput>(null);

  const [mode, setMode] = useState<Mode>('member');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
  }, []);

  const canSubmit = useMemo(() => {
    const identifier = mode === 'member' ? phone : email;
    return identifier.trim().length > 0 && password.length > 0 && !busy;
  }, [mode, phone, email, password, busy]);

  const submit = useCallback(async () => {
    setError(null);

    if (!password) {
      setError('Enter your password.');
      return;
    }

    let e164: string | null = null;
    if (mode === 'member') {
      e164 = normalizePhone(phone);
      if (!e164) {
        setError('Enter a valid mobile number (10 digits).');
        return;
      }
    } else if (!email.includes('@')) {
      setError('Enter the email your gym or RepBook gave you.');
      return;
    }

    setBusy(true);
    try {
      const session =
        mode === 'member' && e164
          ? await signInWithPhone(e164, password)
          : await signInWithEmail(email, password);

      // Credentials are good from here on. A failure below is a data problem,
      // not a password problem, so it must not be reported as one — the root
      // AuthGate owns loading the profile and shows its own retry state.
      try {
        // Deactivated members are banned in auth, but a profile flipped inactive
        // without a ban must not get in either (US-05).
        const profile = await fetchProfile(session.user.id);
        if (profile && !profile.is_active) {
          await signOut();
          setError(AUTH_MESSAGES.inactive);
          return;
        }
        // Seed the cache so the root router doesn't refetch what we just read.
        queryClient.setQueryData(profileKey(session.user.id), profile);
      } catch {
        // Leave it to the AuthGate.
      }

      setPassword('');
      // No navigation here: the root AuthGate routes by role.
    } catch (caught) {
      setError(friendlyAuthMessage(caught, mode === 'member' ? 'phone' : 'email'));
    } finally {
      setBusy(false);
    }
  }, [mode, phone, email, password, queryClient]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.wordmark}>REPBOOK</Text>
            <Text style={styles.tagline}>Beat last week.</Text>
          </View>

          <Segmented options={MODES} value={mode} onChange={switchMode} />

          <View style={styles.form}>
            {mode === 'member' ? (
              <TextField
                label="Phone number"
                prefix={DEFAULT_COUNTRY_CODE}
                value={phone}
                onChangeText={(text) => setPhone(localDigits(text))}
                placeholder="98765 43210"
                keyboardType="number-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                maxLength={12}
              />
            ) : (
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@gym.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            )}

            <TextField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Sign in"
              onPress={() => void submit()}
              loading={busy}
              disabled={!canSubmit}
            />

            <Pressable
              onPress={() => setHelpOpen(true)}
              accessibilityRole="button"
              style={styles.help}
            >
              <Text style={styles.helpLabel}>Forgot password?</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={helpOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setHelpOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Forgot your password?</Text>
            <Text style={styles.sheetBody}>
              {mode === 'member'
                ? 'Ask your gym to reset it for you. They can issue a new password from their RepBook admin panel — you will set your own on the next sign-in.'
                : 'Ask RepBook support to reset your admin password. A new temporary password will be issued to your email address.'}
            </Text>
            <Button label="Got it" variant="secondary" onPress={() => setHelpOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: space.xl, paddingVertical: space.xl },
  hero: { alignItems: 'center', gap: space.xs },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: 2,
    color: colors.text,
  },
  tagline: { fontFamily: fonts.body, fontSize: 15, color: colors.accent },
  form: { gap: space.lg },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
  help: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md },
  helpLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
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
    padding: space.lg,
    gap: space.md,
  },
  sheetTitle: { fontFamily: fonts.bodyMed, fontSize: 17, color: colors.text },
  sheetBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
});
