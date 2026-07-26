import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import type { GymCredentials } from '@/api/super';
import { Button } from '@/components/Button';
import { CredentialCard } from '@/components/CredentialCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { useCreateGym } from '@/hooks/usePlatformStats';
import { colors, fonts, space } from '@/theme/tokens';

/**
 * Onboard a gym (wireframe screen 10): creates the gym and its first gym_admin,
 * then shows that admin's credentials exactly once.
 */
export default function AddGymScreen() {
  const router = useRouter();
  const createGym = useCreateGym();

  const cityRef = useRef<TextInput>(null);
  const ownerRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<GymCredentials | null>(null);

  const submit = useCallback(async () => {
    setError(null);

    if (name.trim().length === 0) {
      setError('Enter the gym name.');
      return;
    }
    if (ownerName.trim().length === 0) {
      setError('Enter the owner’s name.');
      return;
    }
    if (!ownerEmail.includes('@')) {
      setError('Enter a valid owner email.');
      return;
    }

    try {
      const result = await createGym.mutateAsync({
        name: name.trim(),
        city: city.trim() || null,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
      });
      setCredentials(result);
      setName('');
      setCity('');
      setOwnerName('');
      setOwnerEmail('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the gym.');
    }
  }, [name, city, ownerName, ownerEmail, createGym]);

  return (
    <Screen>
      <ScreenHeader title="ADD GYM" subtitle="Creates the gym and its admin login" back />

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
                title="Gym created"
                identifierLabel="Email"
                identifier={credentials.email}
                password={credentials.password}
              />
              <Button
                label="Add another gym"
                variant="secondary"
                onPress={() => setCredentials(null)}
              />
              <Button label="Back to dashboard" onPress={() => router.back()} />
            </>
          ) : (
            <>
              <TextField
                label="Gym name"
                value={name}
                onChangeText={setName}
                placeholder="FitZone Gym"
                autoCapitalize="words"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
              <TextField
                ref={cityRef}
                label="City (optional)"
                value={city}
                onChangeText={setCity}
                placeholder="Ahmedabad"
                autoCapitalize="words"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => ownerRef.current?.focus()}
              />
              <TextField
                ref={ownerRef}
                label="Owner name"
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Rahul Patel"
                autoCapitalize="words"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <TextField
                ref={emailRef}
                label="Owner email"
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="owner@fitzone.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label="Create gym"
                onPress={() => void submit()}
                loading={createGym.isPending}
                disabled={createGym.isPending}
              />

              <Text style={styles.note}>
                No email is sent. You hand the credentials to the gym owner, and they set their own
                password on first sign-in.
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
