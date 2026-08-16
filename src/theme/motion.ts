import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Motion spec. Three curves, seven durations, 320ms ceiling — Home to today's
 * log is one tap and must feel instant.
 */

export const duration = {
  push: 280,
  pop: 240,
  tab: 160,
  sheetIn: 300,
  sheetOut: 220,
  dialogIn: 180,
  dialogOut: 140,
  root: 220,
  onboardingDone: 260,
  status: 120,
  /** Reduce Motion collapses everything to this, opacity only. */
  reduced: 120,
} as const;

export const easing = {
  emphasized: Easing.bezier(0.22, 1, 0.36, 1), // entering
  accelerate: Easing.bezier(0.4, 0, 1, 1), // leaving
  sheet: Easing.bezier(0.16, 1, 0.3, 1),
  dialog: Easing.bezier(0.2, 0, 0, 1),
} as const;

/** Drag-to-dismiss thresholds for bottom sheets. */
export const sheetGesture = { distance: 96, velocity: 800, settle: 180 } as const;

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}

/** Stack options that match the spec. Spread into a Stack's screenOptions. */
export const stackMotion = {
  animation: 'slide_from_right',
  animationDuration: duration.push,
} as const;

export const rootMotion = { animation: 'fade', animationDuration: duration.root } as const;
export const tabMotion = { animation: 'fade', animationDuration: duration.tab } as const;
