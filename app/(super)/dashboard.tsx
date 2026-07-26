import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GymStats } from '@/api/super';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CredentialCard } from '@/components/CredentialCard';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import {
  useGymAdmins,
  usePlatformStats,
  useResetAdminPassword,
  useSetGymActive,
} from '@/hooks/usePlatformStats';
import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Platform dashboard (wireframe screen 9). */
export default function DashboardScreen() {
  const router = useRouter();
  const stats = usePlatformStats();
  const setGymActive = useSetGymActive();

  const [selected, setSelected] = useState<GymStats | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<{ email: string; password: string } | null>(
    null,
  );

  const admins = useGymAdmins(selected?.gymId);
  const resetAdmin = useResetAdminPassword();

  const closeSheet = useCallback(() => {
    setSelected(null);
    setAdminCredentials(null); // credentials are never kept around
    setError(null);
  }, []);

  const doResetAdmin = useCallback(
    async (adminId: string) => {
      setError(null);
      try {
        setAdminCredentials(await resetAdmin.mutateAsync(adminId));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not reset that password.');
      }
    },
    [resetAdmin],
  );

  const toggleGym = useCallback(async () => {
    if (!selected) return;
    setError(null);
    setConfirming(false);
    try {
      await setGymActive.mutateAsync({ gymId: selected.gymId, active: !selected.isActive });
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this gym.');
    }
  }, [selected, setGymActive]);

  return (
    <Screen>
      <ScreenHeader
        title="PLATFORM"
        subtitle="RepBook"
        right={
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Text style={styles.gearGlyph}>⚙</Text>
          </Pressable>
        }
      />

      {stats.isLoading ? (
        <LoadingState />
      ) : stats.isError ? (
        <ErrorState
          message="Couldn't load platform stats. Check your connection and try again."
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <>
          <View style={styles.stats}>
            <StatCard value={String(stats.data?.totals.gyms ?? 0)} label="Gyms" />
            <StatCard value={String(stats.data?.totals.members ?? 0)} label="Members" />
            <StatCard value={String(stats.data?.totals.active30d ?? 0)} label="Active 30d" />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionTitle}>GYMS</Text>

          <FlatList
            data={stats.data?.gyms ?? []}
            keyExtractor={(gym) => gym.gymId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState title="No gyms yet" hint="Onboard your first gym 👇" />
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelected(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.members} members`}
                style={({ pressed }) => [styles.gymRow, pressed && styles.pressed]}
              >
                <View style={styles.gymMain}>
                  <Text style={styles.gymName} numberOfLines={1}>
                    {item.name}
                    {item.city ? <Text style={styles.gymCity}> · {item.city}</Text> : null}
                  </Text>
                  <Text style={styles.gymMeta}>
                    {item.members} member{item.members === 1 ? '' : 's'} · {item.activeMembers30d}{' '}
                    active
                  </Text>
                </View>
                {item.isActive ? null : (
                  <View style={styles.suspended}>
                    <Text style={styles.suspendedLabel}>Suspended</Text>
                  </View>
                )}
              </Pressable>
            )}
          />

          <View style={styles.footer}>
            <Button label="＋ Add gym" onPress={() => router.push('/add-gym')} />
          </View>
        </>
      )}

      {/* Gym detail sheet */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.sheetTitle}>{selected?.name}</Text>
            <Text style={styles.sheetMeta}>
              {selected?.city ?? 'No city'} · {selected?.isActive ? 'Active' : 'Suspended'}
            </Text>

            {/* Sheet-level errors must render INSIDE the sheet — anything in the
                screen body sits behind the modal and is never seen. */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.sheetStats}>
              <StatCard value={String(selected?.members ?? 0)} label="Members" />
              <StatCard value={String(selected?.activeMembers30d ?? 0)} label="Active 30d" />
            </View>

            <View style={styles.contact}>
              <Text style={styles.contactTitle}>GYM ADMIN LOGINS</Text>
              {admins.isLoading ? (
                <Text style={styles.contactRow}>Loading…</Text>
              ) : (admins.data ?? []).length === 0 ? (
                <Text style={styles.contactRow}>No admin login on this gym.</Text>
              ) : (
                (admins.data ?? []).map((admin) => (
                  <View key={admin.id} style={styles.adminRow}>
                    <Text style={styles.contactRow} numberOfLines={1}>
                      {admin.display_name ?? 'Unnamed'}
                      {admin.phone ? ` · ${formatPhone(admin.phone)}` : ''}
                    </Text>
                    <Pressable
                      onPress={() => void doResetAdmin(admin.id)}
                      disabled={resetAdmin.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={`Reset the gym admin password for ${admin.display_name ?? 'this admin'}`}
                      style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.resetLabel}>
                        {resetAdmin.isPending ? 'Resetting…' : 'Reset admin password'}
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.privacyNote}>
              Member accounts belong to this gym — its admin manages and resets them. You only see
              counts here, never member logins or workouts.
            </Text>

            {adminCredentials ? (
              <CredentialCard
                title="New gym admin password"
                identifierLabel="Email"
                identifier={adminCredentials.email}
                password={adminCredentials.password}
              />
            ) : null}

            {selected?.isActive ? (
              <Button
                label="Deactivate gym"
                variant="danger"
                loading={setGymActive.isPending}
                onPress={() => setConfirming(true)}
              />
            ) : (
              <Button
                label="Reactivate gym"
                loading={setGymActive.isPending}
                onPress={() => setConfirming(true)}
              />
            )}
            <Button label="Close" variant="secondary" onPress={closeSheet} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={confirming}
        title={selected?.isActive ? `Deactivate ${selected.name}?` : `Reactivate ${selected?.name}?`}
        message={
          selected?.isActive
            ? 'Everyone at this gym — admins and members — is signed out and blocked from logging in. All workout history is kept.'
            : 'Admins and members can log in again. Members the gym deactivated individually stay deactivated.'
        }
        confirmLabel={selected?.isActive ? 'Deactivate gym' : 'Reactivate gym'}
        destructive={selected?.isActive === true}
        onConfirm={() => void toggleGym()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 20, color: colors.muted },
  stats: { flexDirection: 'row', gap: space.sm, paddingBottom: space.md },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, paddingBottom: space.sm },
  sectionTitle: {
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
    paddingBottom: space.sm,
  },
  list: { gap: space.sm, paddingBottom: space.md },
  gymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.md,
  },
  pressed: { opacity: 0.85 },
  gymMain: { flex: 1, gap: 2 },
  gymName: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  gymCity: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  gymMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  suspended: {
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  suspendedLabel: { fontFamily: fonts.bodyMed, fontSize: 11, color: colors.danger },
  footer: { paddingVertical: space.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    // Tall content (stats + admins + credential card) must scroll rather than
    // overflow past the top of the screen.
    maxHeight: '88%',
  },
  sheetContent: { padding: space.lg, gap: space.md },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  sheetMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  sheetStats: { flexDirection: 'row', gap: space.sm },
  contact: { gap: 2 },
  contactTitle: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1, color: colors.dim },
  privacyNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.dim },
  contactRow: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  resetButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
  },
  resetLabel: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.accent },
});
