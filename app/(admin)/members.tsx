import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MemberActivity } from '@/api/admin';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CredentialCard } from '@/components/CredentialCard';
import { MemberRow } from '@/components/MemberRow';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useGymName, useProfile } from '@/hooks/useProfile';
import { useMembers, useResetMemberPassword, useSetMemberActive } from '@/hooks/useMembers';
import { useSession } from '@/hooks/useSession';
import { colors, fonts, radius, space, HIT_SLOP_MIN } from '@/theme/tokens';

type Pending = { kind: 'deactivate' | 'reactivate'; member: MemberActivity } | null;

/** Gym admin members list (wireframe screen 7). Aggregates only — never logs. */
export default function MembersScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: gymName } = useGymName(profile?.gym_id);

  const [search, setSearch] = useState('');
  const { members, counts, isLoading, isError, refetch } = useMembers(search);

  const [selected, setSelected] = useState<MemberActivity | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useResetMemberPassword();
  const setActive = useSetMemberActive();

  const closeSheet = useCallback(() => {
    setSelected(null);
    setNewPassword(null); // credentials are never kept around
    setError(null);
  }, []);

  const doReset = useCallback(async () => {
    if (!selected) return;
    setError(null);
    try {
      const { password } = await resetPassword.mutateAsync(selected.id);
      setNewPassword(password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset the password.');
    }
  }, [selected, resetPassword]);

  const doSetActive = useCallback(
    async (member: MemberActivity, active: boolean) => {
      setError(null);
      try {
        await setActive.mutateAsync({ memberId: member.id, active });
        setPending(null);
        setSelected(null);
      } catch (caught) {
        setPending(null);
        setError(caught instanceof Error ? caught.message : 'Could not update this member.');
      }
    },
    [setActive],
  );

  return (
    <Screen>
      <ScreenHeader
        title={gymName ?? 'YOUR GYM'}
        subtitle={`${counts.total} member${counts.total === 1 ? '' : 's'} · ${counts.active} active`}
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

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  Search name or phone"
          placeholderTextColor={colors.dim}
          selectionColor={colors.accent}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search members"
          style={styles.search}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Couldn't load your members. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(member) => member.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            search ? (
              <EmptyState title="No match" hint="Try a different name or number." />
            ) : (
              <EmptyState title="No members yet" hint="Add your first member 👇" />
            )
          }
          renderItem={({ item }) => <MemberRow member={item} onPress={setSelected} />}
        />
      )}

      <View style={styles.footer}>
        <Button label="＋ Add member" onPress={() => router.push('/add-member')} />
      </View>

      {/* Member sheet: reset password / deactivate / reactivate */}
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
            <Text style={styles.sheetTitle}>{selected?.display_name ?? 'Member'}</Text>
            <Text style={styles.sheetMeta}>
              {selected?.is_active ? 'Active' : 'Inactive'} ·{' '}
              {selected?.weeks_logged ?? 0} weeks logged
            </Text>

            {/* Sheet-level errors must render INSIDE the sheet — anything in the
                screen body sits behind the modal and is never seen. */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {newPassword && selected ? (
              <CredentialCard
                title="New password issued"
                identifierLabel="Phone"
                identifier={selected.phone ?? ''}
                password={newPassword}
                whatsappTo={selected.phone}
              />
            ) : (
              <View style={styles.sheetActions}>
                <Button
                  label="Reset password"
                  variant="secondary"
                  loading={resetPassword.isPending}
                  onPress={() => void doReset()}
                />
                {selected?.is_active ? (
                  <Button
                    label="Deactivate member"
                    variant="danger"
                    onPress={() => selected && setPending({ kind: 'deactivate', member: selected })}
                  />
                ) : (
                  <Button
                    label="Reactivate member"
                    variant="primary"
                    onPress={() => selected && setPending({ kind: 'reactivate', member: selected })}
                  />
                )}
              </View>
            )}

            <Button label="Close" variant="secondary" onPress={closeSheet} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={pending !== null}
        title={
          pending?.kind === 'deactivate'
            ? `Deactivate ${pending.member.display_name ?? 'this member'}?`
            : `Reactivate ${pending?.member.display_name ?? 'this member'}?`
        }
        message={
          pending?.kind === 'deactivate'
            ? 'They will be signed out and cannot log in until you reactivate them. Their workout history is kept.'
            : 'They will be able to log in again with their existing password.'
        }
        confirmLabel={pending?.kind === 'deactivate' ? 'Deactivate' : 'Reactivate'}
        destructive={pending?.kind === 'deactivate'}
        onConfirm={() => {
          if (pending) void doSetActive(pending.member, pending.kind === 'reactivate');
        }}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gearGlyph: { fontSize: 20, color: colors.muted },
  searchRow: { paddingBottom: space.sm },
  search: {
    minHeight: HIT_SLOP_MIN,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, paddingBottom: space.sm },
  list: { gap: space.sm, paddingBottom: space.md },
  footer: { paddingVertical: space.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '88%',
  },
  sheetContent: { padding: space.lg, gap: space.md },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  sheetMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  sheetActions: { gap: space.sm },
});
