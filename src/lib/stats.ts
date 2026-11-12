/**
 * Statystyki treningowe dla pulpitu.
 *
 * Definicje (ustalone razem z użytkownikiem):
 *
 *  • **Zaliczony trening (dzień)** — dzień ma ćwiczenia i w każdym
 *    ćwiczeniu jest przynajmniej jedna seria oznaczona jako wykonana.
 *  • **Zaliczony tydzień** — tydzień ma przynajmniej jeden dzień treningowy
 *    i każdy dzień treningowy jest zaliczony.
 *  • **Wolumen** — suma `waga × powtórzenia` z **tylko zaliczonych serii**.
 *    Waga hantli jest podwajana (20 kg na hantlę = 40 kg), a w ćwiczeniach
 *    jednostronnych nie (tam waga dotyczy jednej strony). Serie bez zapisanych
 *    powtórzeń nie doliczają się — tak jak w `SetTracker`.
 *
 * Wszystko liczone jest po **wszystkich zapisanych tygodniach**, a nie tylko
 * po bieżącym — dlatego funkcje przyjmują mapę `weekKey → dni`.
 */
import { Exercise, SetLog, WorkoutDay } from '../types';
import { getMondayOf, getWeekKey, mondayOfWeekKey } from '../store/weekStore';

/** Tydzień w formacie `2026-W43` → 7 dni (indeks 0 = poniedziałek). */
export type WeeksMap = Record<string, WorkoutDay[]>;

/**
 * Czy ćwiczenie jest cardio (mierzone czasem).
 *
 * Cardio nie ma serii — tracker pokazuje dla niego wyłącznie czas trwania,
 * więc nie da się w nim zaznaczyć „zrobione”. Dlatego nie może też blokować
 * zaliczenia dnia ani tygodnia.
 */
export function isCardioExercise(exercise: Exercise): boolean {
  return exercise.muscleGroup === 'Cardio';
}

/** Czy ćwiczenie ma przynajmniej jedną zaliczoną serię. */
export function isExerciseDone(exercise: Exercise): boolean {
  return (exercise.setLogs ?? []).some(log => log.done);
}

/**
 * Czy ćwiczenie **blokuje** zaliczenie dnia (a przez to tygodnia).
 *
 * • Ćwiczenie siłowe — blokuje, dopóki nie ma zaliczonej serii.
 * • Cardio z zapisem (nowy model: jedna „seria” = wykonane minuty) —
 *   blokuje, dopóki nie jest oznaczone jako zrobione.
 * • Cardio **bez** zapisu (dane sprzed wprowadzenia oznaczenia cardio) —
 *   nie blokuje: aplikacja nie umie zmierzyć, czy taki trening się odbył,
 *   a użytkownik oczekuje, że tydzień z cardio liczy się do passy.
 */
export function exerciseBlocksCompletion(exercise: Exercise): boolean {
  if (!isCardioExercise(exercise)) return !isExerciseDone(exercise);

  const logs = exercise.setLogs ?? [];
  if (logs.length === 0) return false; // cardio z danych sprzed wersji — nie mierzymy go
  return !logs.some(log => log.done);
}

/** Zliczone minuty cardio (tylko z oznaczonych jako zrobione). */
export function cardioMinutes(exercise: Exercise): number {
  if (!isCardioExercise(exercise)) return 0;
  return (exercise.setLogs ?? [])
    .filter(log => log.done && typeof log.actualReps === 'number')
    .reduce((acc, log) => acc + (log.actualReps ?? 0), 0);
}

/**
 * Czy dzień treningowy ma zaliczoną serię (na potrzeby licznika
 * „Treningi w miesiącu”).
 *
 * **Cardio jest pomijane** — ćwiczenia cardio nie mają w ogóle serii
 * (tracker pokazuje dla nich tylko licznik minut), więc nigdy nie miałyby
 * zaliczonej serii i blokowałyby każdy taki dzień.
 *
 * Dzień z samym cardio **nie jest** uznawany za zaliczone: brak serii =
 * brak dowodu, że trening się odbył.
 */
export function isDayCompleted(day: WorkoutDay): boolean {
  const exercises = day.exercises ?? [];
  if (exercises.length === 0) return false;

  // Coś, czego się nie zrobiło (np. nieznaczone cardio) → dzień nie jest zaliczony.
  if (exercises.some(exerciseBlocksCompletion)) return false;

  // Musi być COKOLWIEK zaliczonego — sam zaplanowany cardio bez oznaczenia
  // nie jest dowodem, że trening się odbył.
  return exercises.some(isExerciseDone);
}

/**
 * Czy tydzień wchodzi do passy („ćwiczysz już”).
 *
 * Dzień bez ćwiczeń (odpoczynek) nie jest brany pod uwagę — inaczej tydzień
 * z samymi dniami wolnymi byłby „zaliczony” bez żadnego treningu.
 *
 * **Cardio nie blokuje passy.** Ćwiczenia cardio nie mają serii (tracker
 * pokazuje dla nich wyłącznie czas trwania), więc przy starym warunku
 * („każde ćwiczenie musi mieć zaliczoną serię”) każdy tydzień z cardio
 * byłby uznawany za nietreningowy i passa przerywała się na nim.
 *
 * Dzień z samym cardio traktujemy jako odtreningowany — aplikacja nie ma
 * stanu „cardio zrobione”, więc nie możemy tego wykluczyć, a użytkownik
 * od tej reguły oczekuje passy.
 */
export function isWeekCompleted(days: WorkoutDay[]): boolean {
  const trainingDays = days.filter(d => d.exercises && d.exercises.length > 0);
  if (trainingDays.length === 0) return false;

  return trainingDays.every(day => {
    const exercises = day.exercises ?? [];
    // Cardio z danych sprzed wersji (bez zapisu) nie blokuje — nie da się
    // go zmierzyć, więc nie karamy użytkownika za brak danych.
    return !exercises.some(exerciseBlocksCompletion);
  });
}

/** Czy ćwiczenie jest wykonywane hantlami (waga dotyczy jednej hantli). */
function isDumbbellExercise(exercise: Exercise): boolean {
  return !!exercise.requiredEquipment?.includes('dumbbells');
}

/**
 * Waga serii w rozliczeniu wolumenu.
 *
 * Hantle: 20 kg na hantlę = 40 kg w treningu. Ćwiczenia jednostronne: waga
 * dotyczy jednej strony, więc nie podwajamy.
 */
export function effectiveWeight(exercise: Exercise, weight: number | null | undefined): number {
  if (weight == null) return 0;
  if (isDumbbellExercise(exercise) && !exercise.isUnilateral) return weight * 2;
  return weight;
}

/**
 * Wolumen jednej serii.
 *
 * Liczymy tylko serie:
 *  • oznaczone jako wykonane (`done`),
 *  • z zapisanymi powtórzeniami (`actualReps`) i wagą.
 */
export function setVolume(exercise: Exercise, log: SetLog): number {
  if (!log.done) return 0;
  if (log.actualReps == null) return 0;
  const weight = effectiveWeight(exercise, log.weight ?? exercise.weight);
  if (!weight) return 0;
  return weight * log.actualReps;
}

/** Wolumen całego dnia (tylko zaliczone serie). */
export function dayVolume(day: WorkoutDay): number {
  return (day.exercises ?? []).reduce(
    (acc, ex) => acc + (ex.setLogs ?? []).reduce((s, log) => s + setVolume(ex, log), 0),
    0
  );
}

/** Wolumen całego tygodnia. */
export function weekVolume(days: WorkoutDay[]): number {
  return days.reduce((acc, d) => acc + dayVolume(d), 0);
}

/** Data dnia w tygodniu (`weekKey` + indeks 0 = poniedziałek). */
export function dayDate(weekKey: string, dayIndex: number): Date | null {
  const monday = mondayOfWeekKey(weekKey);
  if (!monday) return null;
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return d;
}

/** Klucz tygodnia (tygodzń zawierający podaną datę) — f/** Klucz tygodnia zawierającego podaną datę — format `YYYY-Www`. */
function weekKeyOf(date: Date): string {
  return getWeekKey(getMondayOf(date));
}

export interface WorkoutStats {
  /** Zaliczone dni treningowe w bieżącym miesiącu kalendarzowym. */
  monthWorkouts: number;
  /** Tygodnie z rzędu (niedokończony bieżący tydzień jest pomijany). */
  streakWeeks: number;
  /** Wolumen (kg) z zaliczonych serii w bieżącym tygodniu. */
  weekVolume: number;
  /** Wolumen (kg) ze wszystkich zaliczonych serii od początku. */
  totalVolume: number;
  /** Minuty cardio zaliczone w bieżącym tygodniu. */
  weekCardioMinutes: number;
  /** Minuty cardio zaliczone od początku. */
  totalCardioMinutes: number;
  /** Ile zaliconych treningów było w bieżącym miesiącu — do komunikatów. */
  monthLabel: string;
}

/**
 * Liczy statystyki na podstawie wszystkich zapisanych tygodni.
 *
 * `now` pozwala testować na danym dacie (domyślnie: teraz).
 */
export function computeWorkoutStats(weeks: WeeksMap, now: Date = new Date()): WorkoutStats {
  const month = now.getMonth();
  const year = now.getFullYear();

  let monthWorkouts = 0;
  let totalVolume = 0;
  let totalCardioMinutes = 0;

  for (const [weekKey, days] of Object.entries(weeks)) {
    if (!days) continue;
    for (const day of days) {
      if (!day.exercises || day.exercises.length === 0) continue;

      // Wolumen — ze wszystkich zaliczonych serii (od początku).
      totalVolume += dayVolume(day);

      // Minuty cardio — tylko te oznaczone jako zrobione.
      for (const ex of day.exercises) {
        totalCardioMinutes += cardioMinutes(ex);
      }

      // Zaliczone treningi w bieżącym miesiącu.
      const date = dayDate(weekKey, day.dayIndex);
      if (date && date.getMonth() === month && date.getFullYear() === year && isDayCompleted(day)) {
        monthWorkouts++;
      }
    }
  }

  // ── Passa: kolejne zaliczone tygodnie ──
  // Bieżący, niedokończony tydzień jest POMIJANY — w poniedziałek rano
  // seria byłaby zerowa i użytkownik traciłby passę, której nie zepsuł.
  const streakWeeks = countStreak(weeks, now);

  const currentWeekKey = weekKeyOf(now);
  const currentWeek = weeks[currentWeekKey] ?? [];

  return {
    monthWorkouts,
    streakWeeks,
    weekVolume: weekVolume(currentWeek),
    totalVolume,
    weekCardioMinutes: (currentWeek ?? []).reduce(
      (acc, d) => acc + (d.exercises ?? []).reduce((a, e) => a + cardioMinutes(e), 0),
      0
    ),
    totalCardioMinutes,
    monthLabel: new Intl.DateTimeFormat('pl-PL', { month: 'long' }).format(now),
  };
}

/** Liczba kolejnych zaliconych tygodni (wstecz od bieżącego). */
export function countStreak(weeks: WeeksMap, now: Date = new Date()): number {
  // cofnij się do poniedziałku bieżącego tygodnia
  const cursor = getMondayOf(now);

  let streak = 0;
  for (let i = 0; i < 520; i++) {
    const key = weekKeyOf(cursor);
    const days = weeks[key];
    const completed = !!days && isWeekCompleted(days);

    if (completed) {
      streak++;
    } else if (i === 0) {
      // bieżący tydzień niedokończony — pomijamy, nie zerw passy
    } else {
      break; // przerwa w passie
    }

    cursor.setDate(cursor.getDate() - 7);
  }

  return streak;
}

/** Formatowanie liczby z separatorem tysięcy (12 480). */
export function formatNumberPL(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(Math.round(value));
}

/** Formatowanie masy: „12 480 kg”. */
export function formatVolumePL(value: number): string {
  return `${formatNumberPL(value)} kg`;
}
