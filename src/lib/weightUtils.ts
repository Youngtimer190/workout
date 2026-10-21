import { Exercise } from '../types';

/**
 * Checks if an exercise requires dumbbells
 * Null-safe: callers may pass a not-yet-selected exercise (e.g. a modal's
 * initial render before the user picks one).
 */
export function requiresDumbbells(exercise: Exercise | null | undefined): boolean {
  return !!exercise?.requiredEquipment?.includes('dumbbells');
}

/**
 * Gets the display weight for an exercise.
 * For dumbbell exercises, shows 2x the entered weight (since both arms are used).
 * For other exercises, shows the entered weight as-is.
 */
export function getDisplayWeight(exercise: Exercise | null | undefined): number | undefined {
  if (!exercise || exercise.weight == null) return undefined;
  return requiresDumbbells(exercise) ? exercise.weight * 2 : exercise.weight;
}

/**
 * Gets the calculation weight for an exercise.
 * For dumbbell exercises, uses 2x the entered weight in calculations (total volume, etc).
 * For other exercises, uses the entered weight as-is.
 */
export function getCalculationWeight(exercise: Exercise | null | undefined): number | undefined {
  if (!exercise || exercise.weight == null) return undefined;
  return requiresDumbbells(exercise) ? exercise.weight * 2 : exercise.weight;
}

/**
 * Formats weight for display with proper units and dumbbell prefix indication.
 * Returns formatted string like "2 x 20 kg" for dumbbell exercises, or "20 kg" for others.
 */
export function formatWeightDisplay(exercise: Exercise | null | undefined): string {
  if (!exercise) return '—';

  const weight = exercise.weight;
  if (weight === null) return '—';

  if (requiresDumbbells(exercise)) {
    return `2 x ${weight} kg`;
  }

  return `${weight} kg`;
}
