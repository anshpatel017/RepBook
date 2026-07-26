import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MemberActivity } from '@/api/admin';
import { daysSince, lastWorkoutLabel } from '@/hooks/useMembers';
import { formatPhone } from '@/lib/phone';
import { colors, fonts, radius, space } from '@/theme/tokens';

/** Inactivity threshold the wireframe calls out as a warning. */
const STALE_DAYS = 14;

/** One member in the admin list (wireframe screen 7). No workout data, ever. */
export const MemberRow = memo(function MemberRow({
  member,
  onPress,
}: {
  member: MemberActivity;
  onPress: (member: MemberActivity) => void;
}) {
  const days = daysSince(member.last_workout_at);
  const stale = days === null || days > STALE_DAYS;

  return (
    <Pressable
      onPress={() => onPress(member)}
      accessibilityRole="button"
      accessibilityLabel={`${member.display_name ?? 'Member'}, ${lastWorkoutLabel(member.last_workout_at)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {member.display_name ?? 'Unnamed member'}
        </Text>
        <Text style={styles.phone}>{member.phone ? formatPhone(member.phone) : 'No phone'}</Text>
        <Text style={[styles.activity, stale && styles.activityStale]}>
          {lastWorkoutLabel(member.last_workout_at)}
          {member.weeks_logged > 0
            ? ` · ${member.weeks_logged} week${member.weeks_logged === 1 ? '' : 's'} logged`
            : ''}
        </Text>
      </View>

      <View style={[styles.badge, member.is_active ? styles.badgeActive : styles.badgeInactive]}>
        <Text style={[styles.badgeLabel, member.is_active ? styles.badgeLabelActive : styles.badgeLabelInactive]}>
          {member.is_active ? 'Active ●' : 'Inactive'}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
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
  main: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  phone: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  activity: { fontFamily: fonts.body, fontSize: 12, color: colors.dim },
  activityStale: { color: colors.danger },
  badge: {
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  badgeActive: { borderColor: colors.accent, backgroundColor: colors.accentDark },
  badgeInactive: { borderColor: colors.line, backgroundColor: colors.card2 },
  badgeLabel: { fontFamily: fonts.bodyMed, fontSize: 11 },
  badgeLabelActive: { color: colors.accent },
  badgeLabelInactive: { color: colors.dim },
});
