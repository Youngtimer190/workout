/**
 * Cardio — wspólna logika oznaczania wykonania.
 *
 * Cardio nie ma serii. Ma **jeden zapis**, w którym:
 *  • `done`       — czy ćwiczenie zostało wykonane,
 *  • `actualReps` — ile minut faktycznie trwało (może różnić się od planu),
 *  • `targetReps` — planowany czas (np. „20 min”).
 *
 * Dlaczego osobny moduł: oznaczanie dotyka kilku miejsc (karta ćwiczenia,
 * tracker, dodawanie do planu, generator) i wszystkie muszą tworzyć **ten
 * sam** format zapisu — inaczej statystyki i zaliczanie dni się rozjeżdżają.
 */
import { Exercise, SetLog } from '../types';

/** Domyślny czas cardio, gdy ćwiczenie nie ma ustawionej długości. */
export const CARDIO_DEFAULT_MINUTES = 30;

/** Czy ćwiczenie jest cardio (mierzone czasem, nie seriami). */
export function isCardioExercise(exercise: Exercise): boolean {
  return exercise.muscleGroup === 'Cardio';
}

/**
 * Tworzy JEDEN zapis cardio (zastępuje poprzedni).
 *
 * @param existing      poprzednie zapisy (zachowujemy ich `id`)
 * @param plannedMinutes zapisany w ćwiczeniu czas (plan)
 * @param options.done    nowy stan wykonania (domyślnie: bez zmian)
 * @param options.minuty  minuty wpisane przez użytkownika
 */
export function buildCardioLog(
  existing: SetLog[] | undefined,
  plannedMinutes?: number,
  options: { done?: boolean; minutes?: number } = {}
): SetLog[] {
  const prev = existing?.[0];
  const planned = plannedMinutes ?? CARDIO_DEFAULT_MINUTES;
  const done = options.done ?? prev?.done ?? false;

  // Minuty wpisane przez użytkownika (mogą różnić się od planu).
  // Trzymamy je także po cofnięciu oznaczenia, żeby kolejne oznaczenie
  // pamiętało poprzednią wartość.
  const minutes = options.minutes ?? prev?.actualReps ?? null;

  return [{
    id: prev?.id ?? `cardio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    setNumber: 1,
    targetReps: `${planned} min`,
    actualReps: minutes ?? (done ? planned : null),
    weight: null,
    done,
    completedAt: done ? (prev?.completedAt ?? Date.now()) : undefined,
  }];
}

/**
 * Upewnia się, że ćwiczenie cardio ma zapis.
 *
 * Bez tego świeżo dodane cardio nie miałoby żadnego zapisu i — zgodnie
 * z regułą „dane sprzed wersji z oznaczaniem cardio nie blokują passy" —
 * nie blokowałoby zaliczenia dnia. Tymczasem tydzień ma być liczony tylko
 * wtedy, gdy WSZYSTKO się zrobiło. Dlatego każde nowe cardio w planie dostaje
 * zapis z `done: false` i czeka na oznaczenie.
 *
 * Ćwiczenia zapisane PRZED wprowadzeniem tej funkcji (brak zapisu) pozostają
 * nietknięte — nie psujemy historii użytkownika.
 */
export function ensureCardioLog(exercise: Exercise): Exercise {
  if (!isCardioExercise(exercise)) return exercise;
  if ((exercise.setLogs ?? []).length > 0) return exercise;
  return { ...exercise, setLogs: buildCardioLog([], exercise.duration) };
}
