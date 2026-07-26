import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, fonts, radius, space } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  /** Centers content vertically — for login, loading and empty screens. */
  center?: boolean;
  edges?: readonly Edge[];
  padded?: boolean;
};

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

/** Every screen ships loading + error + empty states (CLAUDE.md). */
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
  screen: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: space.lg },
  center: { justifyContent: 'center' },
  stateBox: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  stateTitle: {
    fontFamily: fonts.bodyMed,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.line,
  },
  retryLabel: { fontFamily: fonts.bodyMed, fontSize: 14, color: colors.accent },
});
