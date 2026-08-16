import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { signOut } from '@/api/auth';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ChoiceRow, SwitchRow } from '@/components/ToggleRow';
import { useGymName, useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { formatPhone } from '@/lib/phone';
import type { Unit } from '@/lib/units';
import { useUiStore } from '@/stores/ui';
import { colors, radius, space, type } from '@/theme/tokens';

const UNITS = [
  { value: 'kg' as const, label: 'kg' },
  { value: 'lb' as const, label: 'lb' },
];

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
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Profile</Text>
          <View style={styles.card}>
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
              <InfoRow label="Current week" value={String(profile?.current_week ?? 1)} accent />
            ) : null}
          </View>
        </View>

        {isMember ? (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Training</Text>
            <View style={styles.cardTight}>
              <ChoiceRow
                label="Weight units"
                hint="Stored in kg either way."
                value={unit}
                options={UNITS}
                onChange={changeUnit}
              />
              <View style={styles.divider} />
              <SwitchRow
                label="Show last week's numbers"
                hint="Delta chips and PR banners while you log."
                value={showGhosts}
                onChange={setShowGhosts}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Account</Text>
          <View style={styles.cardPlain}>
            <Text style={styles.managed}>
              {gymName ? `Managed by ${gymName}` : 'Platform owner account'}
            </Text>
            <Text style={styles.managedHint}>
              {isMember
                ? 'Your gym created this account. Ask them to reset your password or update your details.'
                : 'Accounts are provisioned by RepBook. There is no self-service account deletion.'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void signOut()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>
          RepBook {Constants.expoConfig?.version ?? ''} · Beat last week.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[accent ? styles.infoValueAccent : styles.infoValue]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl, paddingBottom: space.xxl },
  group: { gap: space.md - 2 },
  groupTitle: { ...type.label, fontSize: 11, letterSpacing: 1.2, color: colors.dim },
  card: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: space.lg },
  cardTight: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: space.lg },
  cardPlain: { backgroundColor: colors.card, borderRadius: 14, padding: space.lg, gap: 6 },
  divider: { height: 1, backgroundColor: colors.line },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  infoLabel: { ...type.bodySm, color: colors.dim },
  infoValue: { ...type.bodyMed, flex: 1, fontSize: 14, textAlign: 'right', color: colors.text },
  infoValueAccent: { ...type.num2, fontSize: 20, flex: 1, textAlign: 'right', color: colors.accent },
  managed: { ...type.display3, color: colors.text },
  managedHint: { ...type.bodySm, fontSize: 12, lineHeight: 18, color: colors.dim },
  signOut: {
    height: 52,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  signOutLabel: { ...type.bodyMed, color: colors.text },
  version: { ...type.micro, textAlign: 'center', color: colors.dim },
});
