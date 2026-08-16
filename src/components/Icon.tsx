import Feather from '@expo/vector-icons/Feather';

import { colors } from '@/theme/tokens';

/**
 * The only icon surface in the app. Feather, because it is line-based at the
 * same weight as the type and ships with Expo (@expo/vector-icons).
 * Replaces the emoji glyphs: ⚙ ⌂ 📈 ✏️ 🗑 ✕ ＋ ‹ 🔍 🔥 😴 ▶ ✓
 */
export type IconName =
  | 'settings'
  | 'play'
  | 'check'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'moon'
  | 'activity'
  | 'trending-up'
  | 'award'
  | 'plus'
  | 'x'
  | 'more-vertical'
  | 'edit-2'
  | 'trash-2'
  | 'eye'
  | 'eye-off'
  | 'arrow-right'
  | 'search'
  | 'key'
  | 'user-x'
  | 'copy'
  | 'alert-triangle'
  | 'clock'
  | 'message-circle'
  | 'slash'
  | 'lock'
  | 'home';

export function Icon({
  name,
  size = 20,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}
