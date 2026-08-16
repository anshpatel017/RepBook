import type { TextStyle } from 'react-native';

/**
 * RepBook design tokens — dark-only, one accent (lime), one warning (amber).
 * Surfaces are separated by FILL, not borders: only `line` hairlines divide
 * rows inside a surface. Do not invent colors or fonts here.
 */

export const colors = {
  bg: '#0D0E10',
  card: '#16181B',
  card2: '#1E2125',
  line: '#2A2E33',
  text: '#F4F5F6',
  muted: '#A7ADB4',
  dim: '#868D95', // 4.6:1 on bg — was #6B7178 (3.6:1)
  accent: '#B5F04A',
  accentDark: '#1B2410', // text/icons on top of accent, and accent-tinted fills
  warn: '#F2B544',
  warnDark: '#2A2210',
  /** "Before" bars in comparison charts — reads as data, not as a surface. */
  barTrack: '#3A4048',
  danger: '#F07A6A',
  dangerDark: '#2A1614',
  scrim: 'rgba(0,0,0,0.62)',
} as const;

export const radius = { card: 16, input: 12, row: 10, chip: 999 } as const;

export const fonts = {
  display: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
} as const;

/** 4pt spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export type TypeToken =
  | 'display1'
  | 'display2'
  | 'display3'
  | 'num1'
  | 'num2'
  | 'body'
  | 'bodyMed'
  | 'bodySm'
  | 'label'
  | 'micro';

/** The only font sizes in the app. Nine tokens replace sixteen ad-hoc sizes. */
export const type: Record<TypeToken, TextStyle> = {
  display1: { fontFamily: fonts.display, fontSize: 44, lineHeight: 44, letterSpacing: -0.5 },
  display2: { fontFamily: fonts.display, fontSize: 30, lineHeight: 32 },
  display3: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  num1: { fontFamily: fonts.display, fontSize: 34, lineHeight: 34 },
  num2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyMed: { fontFamily: fonts.bodyMed, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: {
    fontFamily: fonts.bodyMed,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  micro: { fontFamily: fonts.body, fontSize: 11, lineHeight: 14 },
};

/** Minimum interactive size (accessibility rule: tap targets >= 44pt). */
export const HIT_SLOP_MIN = 44;

/** Field heights: the set you are typing is bigger than the ones you logged. */
export const CONTROL = { row: 44, field: 56, activeField: 60, cta: 56 } as const;

export type Colors = typeof colors;
