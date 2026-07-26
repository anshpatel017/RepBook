import { StyleSheet, Text, View } from 'react-native';

import { signOut } from '@/api/auth';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { useGymName, useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space } from '@/theme/tokens';

/**
 * TEMPORARY. Placeholder for screens whose phase hasn't been built yet, so role
 * routing can be exercised end to end. Each of these files is replaced by the
 * real screen in the phase named on it.
 */
export function PhaseStub({ title, phase }: { title: string; phase: string }) {
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: gymName } = useGymName(profile?.gym_id);

  return (
    <Screen center>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.phase}>{phase} builds this screen</Text>
        </View>

        <View style={styles.card}>
          <Row label="Signed in as" value={profile?.display_name ?? '—'} />
          <Row label="Role" value={profile?.role ?? '—'} />
          {profile?.phone ? <Row label="Phone" value={formatPhone(profile.phone)} /> : null}
          <Row label="Gym" value={gymName ?? (profile?.gym_id ? '…' : 'none (platform owner)')} />
          {profile?.role === 'member' ? (
            <Row label="Current week" value={String(profile.current_week)} />
          ) : null}
        </View>

        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xl },
  header: { gap: space.xs },
  title: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 1, color: colors.text },
  phase: { fontFamily: fonts.body, fontSize: 14, color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  rowLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  rowValue: { flex: 1, textAlign: 'right', fontFamily: fonts.bodyMed, fontSize: 14, color: colors.text },
});
