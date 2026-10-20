import { Exercise } from '../types';

/**
 * Checks if an exercise requires dumbbells
 */
export function requiresDumbbells(exercise: Exercise): boolean {
  return !!exercise.requiredEquipment?.includes('dumbbells');
}

/**
 * Gets the display weight for an exercise.
 * For dumbbell exercises, shows 2x the entered weight (since both arms are used).
 * For other exercises, shows the entered weight as-is.
 */
export function getDisplayWeight(exercise: Exercise): number | undefined {
  if (exercise.weight == null) return undefined;
  return requiresDumbbells(exercise) ? exercise.weight * 2 : exercise.weight;
}

/**
 * Gets the calculation weight for an exercise.
 * For dumbbell exercises, uses 2x the entered weight in calculations (total volume, etc).
 * For other exercises, uses the entered weight as-is.
 */
export function getCalculationWeight(exercise: Exercise): number | undefined {
  if (exercise.weight == null) return undefined;
  return requiresDumbbells(exercise) ? exercise.weight * 2 : exercise.weight;
}

/**
 * Formats weight for display with proper units and dumbbell prefix indication.
 * Returns formatted string like "2 x 20 kg" for dumbbell exercises, or "20 kg" for others.
 */
export function formatWeightDisplay(exercise: Exercise): string {
  const weight = exercise.weight;
  if (weight === null) return '—';

  if (requiresDumbbells(exercise)) {
    return `2 x ${weight} kg`;
  }

  return `${weight} kg`;
}