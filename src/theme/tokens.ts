/**
 * RepBook design tokens — dark-first, one accent (lime).
 * Do not invent new colors or fonts: everything the UI needs lives here.
 */

export const colors = {
  bg: '#101113',
  card: '#191B1E',
  card2: '#212428',
  line: '#2B2F34',
  text: '#F2F3F4',
  muted: '#9AA0A6',
  dim: '#6B7178',
  accent: '#B5F04A',
  accentDark: '#232A12',
  danger: '#F07A6A',
} as const;

export const radius = { card: 14, input: 9, chip: 999 } as const;

export const fonts = {
  display: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMed: 'Inter_500Medium',
} as const;

/** 4pt spacing scale. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Minimum interactive size (accessibility rule: tap targets >= 44pt). */
export const HIT_SLOP_MIN = 44;

export type Colors = typeof colors;
