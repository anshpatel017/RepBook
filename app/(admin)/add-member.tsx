import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import type { MemberCredentials } from '@/api/admin';
import { Button } from '@/components/Button';
import { CredentialCard } from '@/components/CredentialCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { useCreateMember } from '@/hooks/useMembers';
import { DEFAULT_COUNTRY_CODE, localDigits, normalizePhone } from '@/lib/phone';
import { colors, fonts, space } from '@/theme/tokens';

/**
 * Add member (wireframe screen 8): name + phone → the Edge Function creates the
 * account and returns credentials that are shown exactly once.
 */
export default function AddMemberScreen() {
  const router = useRouter();
  const createMember = useCreateMember();
  const phoneRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<MemberCredentials | null>(null);

  const submit = useCallback(async () => {
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError('Enter the member’s name.');
      return;
    }
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError('Enter a valid mobile number (10 digits).');
      return;
    }

    try {
      const result = await createMember.mutateAsync({ name: trimmed, phone: e164 });
      setCredentials(result);
      setName('');
      setPhone('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account.');
    }
  }, [name, phone, createMember]);

  return (
    <Screen>
      <ScreenHeader title="ADD MEMBER" subtitle="They log in with this phone number" back />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {credentials ? (
            <>
              <CredentialCard
                identifierLabel="Phone"
                identifier={credentials.phone}
                password={credentials.password}
                whatsappTo={credentials.phone}
              />
              <Button
                label="Add another member"
                variant="secondary"
                onPress={() => setCredentials(null)}
              />
              <Button label="Back to members" onPress={() => router.back()} />
            </>
          ) : (
            <>
              <TextField
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Rahul Sharma"
                autoCapitalize="words"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              <TextField
                ref={phoneRef}
                label="Phone number"
                prefix={DEFAULT_COUNTRY_CODE}
                value={phone}
                onChangeText={(text) => setPhone(localDigits(text))}
                placeholder="98765 43210"
                keyboardType="number-pad"
                maxLength={12}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label="Create account"
                onPress={() => void submit()}
                loading={createMember.isPending}
                disabled={createMember.isPending}
              />

              <Text style={styles.note}>
                No SMS is sent. You hand the password to the member yourself, and they set their own
                on first sign-in.
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { gap: space.lg, paddingVertical: space.lg },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.dim },
});
