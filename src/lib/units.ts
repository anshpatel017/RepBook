/**
 * Weight is ALWAYS stored in kg (workout_sets.weight_kg).
 * Conversion happens at display/input time only — never in the database.
 */

export type Unit = 'kg' | 'lb';

const LB_PER_KG = 2.2046226218;

/** kg (stored) → the number shown in the UI for the active unit. */
export function kgToDisplay(kg: number, unit: Unit): number {
  return unit === 'kg' ? round1(kg) : round1(kg * LB_PER_KG);
}

/** A number typed by the user in the active unit → kg for storage. */
export function displayToKg(value: number, unit: Unit): number {
  return unit === 'kg' ? round2(value) : round2(value / LB_PER_KG);
}

/** "72.5 kg" / "160 lb" — trailing zeros trimmed. */
export function formatWeight(kg: number, unit: Unit): string {
  return `${trim(kgToDisplay(kg, unit))} ${unit}`;
}

/** Bare display number as a string, for text inputs. */
export function weightInputValue(kg: number | null, unit: Unit): string {
  return kg === null ? '' : trim(kgToDisplay(kg, unit));
}

/**
 * Parse a weight input. Accepts "72", "72.5", "72,5"; returns null when the
 * field is empty or not a usable number (caller decides what to do).
 */
export function parseWeightInput(text: string, unit: Unit): number | null {
  const normalized = text.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return displayToKg(value, unit);
}

/** Parse a reps input (integer, 0–100 per the schema check). */
export function parseRepsInput(text: string): number | null {
  const normalized = text.trim();
  if (!normalized) return null;
  const value = Number.parseInt(normalized, 10);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.min(value, 100);
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const trim = (n: number) => String(n);
