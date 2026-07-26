import Constants from 'expo-constants';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { signOut } from '@/api/auth';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ChoiceRow, SwitchRow } from '@/components/ToggleRow';
import { useGymName, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { formatPhone } from '@/lib/phone';
import type { Unit } from '@/lib/units';
import { useUiStore } from '@/stores/ui';
import { colors, fonts, radius, space } from '@/theme/tokens';

const UNITS = [
  { value: 'kg' as const, label: 'kg' },
  { value: 'lb' as const, label: 'lb' },
];

/** Settings (wireframe screen 6). */
export default function SettingsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile(userId);
  const { data: gymName } = useGymName(profile?.gym_id);
  const updateProfile = useUpdateProfile(userId);

  const unit = useUiStore((state) => state.unit);
  const setUnit = useUiStore((state) => state.setUnit);
  const showGhosts = useUiStore((state) => state.showGhosts);
  const setShowGhosts = useUiStore((state) => state.setShowGhosts);

  // The profile row is the source of truth; mirror it into the UI store on load.
  useEffect(() => {
    if (profile) setUnit(profile.unit);
  }, [profile, setUnit]);

  const changeUnit = (next: Unit) => {
    setUnit(next); // instant display switch
    updateProfile.mutate({ unit: next }); // persisted for the next device
  };

  const isMember = profile?.role === 'member';

  return (
    <Screen>
      <ScreenHeader title="SETTINGS" back />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PROFILE</Text>
          <InfoRow label="Name" value={profile?.display_name ?? '—'} />
          {profile?.phone ? <InfoRow label="Phone" value={formatPhone(profile.phone)} /> : null}
          {session?.user.email ? <InfoRow label="Email" value={session.user.email} /> : null}
          <InfoRow
            label="Role"
            value={
              profile?.role === 'super_admin'
                ? 'Platform owner'
                : profile?.role === 'gym_admin'
                  ? 'Gym admin'
                  : 'Member'
            }
          />
          {isMember ? (
            <InfoRow label="Current week" value={String(profile?.current_week ?? 1)} />
          ) : null}
        </View>

        {isMember ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TRAINING</Text>
            <ChoiceRow
              label="Weight units"
              hint="Stored in kg either way — this only changes what you see."
              value={unit}
              options={UNITS}
              onChange={changeUnit}
            />
            <View style={styles.divider} />
            <SwitchRow
              label="Show last week's numbers"
              hint="Ghost values and PR chips while you log."
              value={showGhosts}
              onChange={setShowGhosts}
            />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>ACCOUNT</Text>
          <Text style={styles.managed}>
            {gymName ? `Managed by ${gymName}` : 'Platform owner account'}
          </Text>
          <Text style={styles.managedHint}>
            {isMember
              ? 'Your gym created this account. Ask them to reset your password or update your details.'
              : 'Accounts are provisioned by RepBook. There is no self-service account deletion.'}
          </Text>
        </View>

        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />

        <Text style={styles.version}>
          RepBook {Constants.expoConfig?.version ?? ''} · Beat last week.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  cardTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.dim },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  infoLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  infoValue: { flex: 1, textAlign: 'right', fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
  divider: { height: 1, backgroundColor: colors.line },
  managed: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  managedHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.dim },
  version: { fontFamily: fonts.body, fontSize: 11, color: colors.dim, textAlign: 'center' },
});
