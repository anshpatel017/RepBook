import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, radius, space, type } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  center?: boolean;
  edges?: readonly Edge[];
  padded?: boolean;
};

/**
 * RepBook is a phone app first. The web build runs the same code in a browser
 * window, so content is capped and centered — on a phone the cap is never
 * reached and nothing changes.
 */
const MAX_CONTENT_WIDTH = 520;

export function Screen({ children, center, edges = ['top', 'bottom'], padded = true }: ScreenProps) {
  return (
    <SafeAreaView
      style={[styles.screen, padded && styles.padded, center && styles.center]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.stateBox}>
      <ActivityIndicator color={colors.accent} />
      {label ? <Text style={styles.stateText}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      {hint ? <Text style={styles.stateText}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  padded: { paddingHorizontal: space.xl },
  center: { justifyContent: 'center' },
  stateBox: { alignItems: 'center', justifyContent: 'center', padding: space.xxl, gap: space.md },
  stateTitle: { ...type.display3, color: colors.text, textAlign: 'center' },
  stateText: { ...type.bodySm, color: colors.muted, textAlign: 'center' },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    backgroundColor: colors.card2,
  },
  retryLabel: { ...type.bodyMed, fontSize: 14, color: colors.accent },
});
