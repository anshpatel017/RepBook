import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { signOut, updatePassword } from '@/api/auth';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useClearMustChangePassword } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { colors, fonts, space } from '@/theme/tokens';

const MIN_LENGTH = 8;

/**
 * Forced first-login password change (wireframe 1b). Blocking by construction:
 * the root router sends every route back here while must_change_password is
 * true, and there is no skip — only "sign out".
 */
export default function ChangePasswordScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const clearFlag = useClearMustChangePassword(userId);
  const repeatRef = useRef<TextInput>(null);

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== repeat) {
      setError("Both passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      await clearFlag.mutateAsync();
      // The root router moves us on as soon as the flag clears.
    } catch {
      setError('Could not save your password. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [password, repeat, clearFlag]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>SET YOUR OWN PASSWORD</Text>
            <Text style={styles.subtitle}>
              You&apos;re using a temporary password from your gym. Pick one only you know.
            </Text>
          </View>

          <View style={styles.form}>
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder={`At least ${MIN_LENGTH} characters`}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => repeatRef.current?.focus()}
            />
            <TextField
              ref={repeatRef}
              label="Repeat password"
              value={repeat}
              onChangeText={setRepeat}
              placeholder="Type it again"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void submit()}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Save & continue"
              onPress={() => void submit()}
              loading={busy}
              disabled={!password || !repeat || busy}
            />
            <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center' },
  content: { gap: space.xl },
  header: { gap: space.sm },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 1,
    color: colors.text,
  },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  form: { gap: space.lg },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
});
