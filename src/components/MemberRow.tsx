import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MemberActivity } from '@/api/admin';
import { Icon } from '@/components/Icon';
import { daysSince, lastWorkoutLabel } from '@/hooks/useMembers';
import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

/** Inactivity threshold the requirements call out as a warning. */
const STALE_DAYS = 14;

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * One member in the admin list. Aggregates only — no weights, ever.
 * Idle > 14 days is amber (warn), not red: it is a nudge, not an error.
 * Active members get a dot, not a badge — a 47-row list of green pills is noise.
 */
export const MemberRow = memo(function MemberRow({
  member,
  onPress,
}: {
  member: MemberActivity;
  onPress: (member: MemberActivity) => void;
}) {
  const days = daysSince(member.last_workout_at);
  const stale = days === null || days > STALE_DAYS;
  const name = member.display_name ?? 'Unnamed member';

  return (
    <Pressable
      onPress={() => onPress(member)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${lastWorkoutLabel(member.last_workout_at)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={[styles.avatarLabel, !member.is_active && styles.dimmed]}>
          {initials(member.display_name)}
        </Text>
      </View>

      <View style={styles.main}>
        <Text style={[styles.name, !member.is_active && styles.dimmed]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {member.phone ? formatPhone(member.phone) : 'No phone'}
          {member.weeks_logged > 0
            ? ` · ${member.weeks_logged} week${member.weeks_logged === 1 ? '' : 's'} logged`
            : ''}
        </Text>
      </View>

      {!member.is_active ? (
        <View style={styles.inactive}>
          <Text style={styles.inactiveLabel}>Inactive</Text>
        </View>
      ) : stale ? (
        <View style={styles.idle}>
          <Icon name="clock" size={11} color={colors.warn} />
          <Text style={styles.idleLabel}>{days === null ? 'Never' : `Idle ${days}d`}</Text>
        </View>
      ) : (
        <View style={styles.active}>
          <View style={styles.dot} />
          <Text style={styles.activeLabel}>{lastWorkoutLabel(member.last_workout_at)}</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: space.md,
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { ...type.num2, fontSize: 18, color: colors.muted },
  main: { flex: 1, gap: 1 },
  name: { ...type.display3, color: colors.text },
  dimmed: { color: colors.dim },
  meta: { ...type.bodySm, fontSize: 12, color: colors.dim },
  active: { alignItems: 'flex-end', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  activeLabel: { ...type.micro, color: colors.dim },
  idle: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    borderRadius: radius.chip,
    backgroundColor: colors.warnDark,
  },
  idleLabel: { ...type.micro, fontFamily: fonts.bodyMed, color: colors.warn },
  inactive: {
    height: 22,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: radius.chip,
    backgroundColor: colors.card2,
  },
  inactiveLabel: { ...type.micro, fontFamily: fonts.bodyMed, color: colors.dim },
});
