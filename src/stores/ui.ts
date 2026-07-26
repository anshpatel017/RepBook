import { create } from 'zustand';

import type { Unit } from '@/lib/units';

/**
 * UI-only state (zustand). Server data always goes through react-query.
 *
 * `unit` mirrors profiles.unit so display switching is instant; the profile row
 * stays the source of truth and Settings writes both.
 * `showGhosts` toggles the "last wk" values under each set input (FR-18).
 */
type UiState = {
  unit: Unit;
  showGhosts: boolean;
  setUnit: (unit: Unit) => void;
  setShowGhosts: (showGhosts: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  unit: 'kg',
  showGhosts: true,
  setUnit: (unit) => set({ unit }),
  setShowGhosts: (showGhosts) => set({ showGhosts }),
}));

/** Convenience selectors for the many screens that only need one field. */
export const useUnit = () => useUiStore((state) => state.unit);
export const useShowGhosts = () => useUiStore((state) => state.showGhosts);
