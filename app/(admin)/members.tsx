import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { MemberActivity } from '@/api/admin';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CredentialCard } from '@/components/CredentialCard';
import { Icon, type IconName } from '@/components/Icon';
import { MemberRow } from '@/components/MemberRow';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  daysSince,
  useMembers,
  useResetMemberPassword,
  useSetMemberActive,
} from '@/hooks/useMembers';
import { useGymName, useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { colors, radius, space, type } from '@/theme/tokens';

type Pending = { kind: 'deactivate' | 'reactivate'; member: MemberActivity } | null;

/** Gym admin members list. Aggregates only — never logs, never weights. */
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

  const idleDays = selected ? daysSince(selected.last_workout_at) : null;

  /** Opens WhatsApp with a message to the member. No workout details, ever. */
  const nudge = useCallback(async () => {
    if (!selected?.phone) return;
    const digits = selected.phone.replace(/\D/g, '');
    const name = selected.display_name?.split(' ')[0] ?? 'there';
    const message = `Hi ${name}, this is ${gymName ?? 'your gym'} — we haven't seen you in a while. See you at the gym soon!`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open WhatsApp on this device.');
    }
  }, [selected, gymName]);

  return (
    <Screen>
      <ScreenHeader
        title={(gymName ?? 'Your gym').toUpperCase()}
        subtitle={`${counts.total} member${counts.total === 1 ? '' : 's'} · ${counts.active} active`}
        right={
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Icon name="settings" size={20} color={colors.muted} />
          </Pressable>
        }
      />

      <View style={styles.search}>
        <Icon name="search" size={18} color={colors.dim} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
          placeholderTextColor={colors.dim}
          selectionColor={colors.accent}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search members"
          style={styles.searchInput}
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            search ? (
              <EmptyState title="No match" hint="Try a different name or number." />
            ) : (
              <EmptyState title="No members yet" hint="Add your first member below." />
            )
          }
          renderItem={({ item }) => <MemberRow member={item} onPress={setSelected} />}
        />
      )}

      <View style={styles.footer}>
        <Button label="ADD MEMBER" icon="plus" onPress={() => router.push('/add-member')} />
      </View>

      {/* Member sheet: reset password / nudge / deactivate */}
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
              <View style={styles.grabber} />

              <Text style={styles.sheetTitle}>{selected?.display_name ?? 'Member'}</Text>
              <Text style={styles.sheetMeta}>
                {selected?.is_active ? 'Active' : 'Inactive'} · {selected?.weeks_logged ?? 0} weeks
                logged
                {idleDays !== null && idleDays > 14 ? (
                  <Text style={styles.idle}> · idle {idleDays} days</Text>
                ) : null}
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
                <View style={styles.actions}>
                  <ActionRow
                    icon="key"
                    tint={colors.accent}
                    label="Reset password"
                    hint="Issues a new temporary password"
                    onPress={() => void doReset()}
                  />
                  {selected?.phone ? (
                    <>
                      <View style={styles.actionDivider} />
                      <ActionRow
                        icon="message-circle"
                        tint={colors.muted}
                        label="Nudge on WhatsApp"
                        hint={
                          idleDays !== null && idleDays > 14
                            ? `Hasn't trained in ${idleDays} days`
                            : 'Send them a message'
                        }
                        onPress={() => void nudge()}
                      />
                    </>
                  ) : null}
                </View>
              )}

              <Text style={styles.privacy}>
                You see attendance only. Weights, reps and workout history belong to the member.
              </Text>

              <View style={styles.sheetDivider} />

              {selected?.is_active ? (
                <Button
                  label="Deactivate member"
                  variant="danger"
                  icon="user-x"
                  onPress={() => selected && setPending({ kind: 'deactivate', member: selected })}
                />
              ) : (
                <Button
                  label="Reactivate member"
                  onPress={() => selected && setPending({ kind: 'reactivate', member: selected })}
                />
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

function ActionRow({
  icon,
  tint,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  tint: string;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <Icon name={icon} size={19} color={tint} />
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionHint}>{hint}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gear: { width: 40, height: 40, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    marginBottom: space.md,
  },
  searchInput: { flex: 1, ...type.body, color: colors.text },
  error: { ...type.bodySm, color: colors.danger, paddingBottom: space.sm },
  list: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', paddingBottom: 0 },
  separator: { height: 1, backgroundColor: colors.line, marginLeft: 66 },
  footer: { paddingVertical: space.md },
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  sheetContent: { padding: space.xl, paddingTop: space.sm, gap: space.md },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  sheetTitle: { ...type.display2, color: colors.text },
  sheetMeta: { ...type.bodySm, color: colors.muted },
  idle: { color: colors.warn },
  actions: { backgroundColor: colors.card2, borderRadius: 14, overflow: 'hidden' },
  actionDivider: { height: 1, backgroundColor: colors.line, marginLeft: 47 },
  actionRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  pressed: { opacity: 0.85 },
  actionText: { flex: 1, gap: 1 },
  actionLabel: { ...type.bodyMed, color: colors.text },
  actionHint: { ...type.micro, color: colors.dim },
  privacy: { ...type.bodySm, fontSize: 12, lineHeight: 18, color: colors.dim },
  sheetDivider: { height: 1, backgroundColor: colors.line },
});
