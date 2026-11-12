/**
 * Liczenie serii treningowych — jedno źródło prawdy dla całej aplikacji.
 *
 * Problem, który to rozwiązuje: plan ćwiczenia ma `sets` (ile serii
 * zaplanowano), a stan faktyczny trzyma `setLogs` (tablica serii, którą
 * można dodawać i usuwać w trackerze). Te dwie liczby rozjeżdżają się —
 * m.in. dlatego wcześniejszy licznik postępu w pasku bocznym pokazywał
 * 125% albo nigdy nie dochodził do 100%.
 *
 * Reguła: jeśli ćwiczenie ma `setLogs`, to one są źródłem prawdy
 * (dodana/usunięta seria zmienia liczbę). W przeciwnym razie bierzemy plan.
 * To dokładnie ta sama reguła, którą stosuje `ExerciseCard`.
 */
import { Exercise, WorkoutDay } from '../types';

/** Ćwiczenie cardio (mierzone czasem) — nie ma serii do odhaczenia. */
export function isCardioExercise(ex: Exercise): boolean {
  return ex.muscleGroup === 'Cardio';
}

/**
 * Faktyczna liczba serii ćwiczenia.
 *
 * `setLogs` ma pierwszeństwo, bo to stan, w którym użytkownik pracuje —
 * seria dodana w trackerze musi się liczyć, a usunięta nie może zostawiać
 * „dziury” w mianowniku. Gdy logów jeszcze nie ma, bierzemy plan.
 */
export function plannedSets(ex: Exercise): number {
  const logs = ex.setLogs ?? [];
  if (logs.length > 0) return logs.length;
  return ex.sets || 0;
}

/** Liczba serii zaznaczonych jako wykonane. */
export function doneSets(ex: Exercise): number {
  return (ex.setLogs ?? []).filter(l => l.done).length;
}

/**
 * Łączna liczba serii w planie.
 *
 * Cardio jest pomijane: w bazie ma `sets: 1`, ale w trackerze nie ma dla
 * niego checkboxów, więc policzenie go w mianowniku uniemożliwiałoby
 * osiągnięcie 100%. Cardio ma osobny miernik (minuty w Statystykach).
 */
export function countPlanSets(exercises: Exercise[]): number {
  return exercises.reduce(
    (acc, e) => acc + (isCardioExercise(e) ? 0 : plannedSets(e)),
    0
  );
}

export interface SetProgress {
  /** Łączna liczba serii w tygodniu. */
  total: number;
  /** Liczba serii wykonanych. */
  done: number;
  /** Procent (0–100). */
  percent: number;
}

/**
 * Postęp tygodnia w seriach — podstawa karty „Twoja forma” w pasku bocznym.
 *
 * Mianownik i licznik pochodzą z TEJ SAMEJ bazy (lista serii), więc postęp
 * nie może przekroczyć 100% ani utknąć poniżej niego.
 */
export function weekSetProgress(days: WorkoutDay[]): SetProgress {
  let total = 0;
  let done = 0;

  for (const day of days) {
    for (const ex of day.exercises) {
      if (isCardioExercise(ex)) continue;
      total += plannedSets(ex);
      done += doneSets(ex);
    }
  }

  const percent = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
  return { total, done, percent };
}
