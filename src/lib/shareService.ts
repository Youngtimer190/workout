/**
 * Serwis udostępniania dni treningowych.
 *
 * Cały odczyt i zapis idzie przez klienta na kluczu `anon` z sesją
 * użytkownika — pod ochroną RLS. Klucz `service_role` nie jest używany
 * (build wbudowuje wszystkie zmienne VITE_* do publicznego bundle, więc
 * klucz admina byłby widoczny dla każdego odwiedzającego).
 *
 * Odbiorca jest dopasowywany po adresie e-mail WEWNĄTRZ RLS — serwer nigdy
 * nie rozwiązuje `email → user_id`, więc aplikacja nie może (i nie musi)
 * ujawniać, czy konto odbiorcy w ogóle istnieje.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import {
  SharedWorkout,
  SharedDaySnapshot,
  ShareStatus,
  Exercise,
  WorkoutDay,
} from '../types';

export interface CreateShareInput {
  recipientEmail: string;
  weekKey: string;
  dayIndex: number;
  dayName: string;
  dayData: SharedDaySnapshot;
}

export interface ShareResult {
  error: Error | null;
  /** Udostępnienie zostało już rozpatrzone (zaakceptowane/odrzucone wcześniej). */
  alreadyHandled?: boolean;
}

const OFFLINE_ERROR = 'Brak konfiguracji Supabase — udostępnianie niedostępne.';

/** Odpowiedź odbiorcy: zaakceptować albo odrzucić. */
export type ShareResponse = Extract<ShareStatus, 'accepted' | 'declined'>;

// ─── Nadawca ────────────────────────────────────────────────────────────────

/**
 * Tworzy udostępnienie dnia.
 *
 * Nadawcę (`owner_id`, `owner_email`, `owner_name`) i status ustawia trigger
 * `normalize_share()` w bazie — klient nie może podszyć się pod kogoś
 * innego ani utworzyć wiersza od razu zaakceptowanego.
 *
 * Powodzenie INSERT oznacza TYLE samo, że odbiorca istnieje, co że nie —
 * komunikat „Udostępniono" jest zawsze taki sam.
 */
export async function createShare(input: CreateShareInput): Promise<ShareResult> {
  if (!isSupabaseConfigured) return { error: new Error(OFFLINE_ERROR) };

  const { error } = await supabase.from('shared_workouts').insert({
    recipient_email: input.recipientEmail.trim().toLowerCase(),
    week_key: input.weekKey,
    day_index: input.dayIndex,
    day_name: input.dayName,
    day_data: input.dayData,
  });

  if (error) {
    console.error('[shareService] createShare error:', error);
    return { error: new Error(error.message) };
  }
  return { error: null };
}

// ─── Odczyty ────────────────────────────────────────────────────────────────

/**
 * Pobiera udostępnienia widoczne dla zalogowanego użytkownika.
 *
 * Zapytanie jest BEZ filtra po e-mailu — RLS i tak odsiewa wiersze, do
 * których użytkownik nie ma prawa. Dzięki temu klient nie musi znać
 * kanonicznej pisowni swojego adresu w `auth.users` (claim `email` w JWT
 * to tylko snapshot i potrafi się rozjechać z wielkością liter).
 */
export async function fetchShares(userId: string): Promise<{
  incoming: SharedWorkout[];
  outgoing: SharedWorkout[];
  error: Error | null;
}> {
  if (!isSupabaseConfigured) return { incoming: [], outgoing: [], error: null };

  const { data, error } = await supabase
    .from('shared_workouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[shareService] fetchShares error:', error);
    return { incoming: [], outgoing: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as SharedWorkout[];
  return {
    incoming: rows.filter(r => r.owner_id !== userId),
    outgoing: rows.filter(r => r.owner_id === userId),
    error: null,
  };
}

// ─── Odbiorca ───────────────────────────────────────────────────────────────

/**
 * Odpowiedź odbiorcy: akceptacja lub odrzucenie.
 *
 * RLS zamraża wiersz po pierwszej odpowiedzi (`USING ... status = 'pending'`),
 * więc druga próba nie zmieni nic — dlatego sprawdzamy liczbę zwróconych
 * wierszy zamiast polegać wyłącznie na braku błędu.
 */
export async function respondToShare(
  shareId: string,
  status: ShareResponse,
  acceptedWeekKey?: string,
  acceptedDayIndex?: number
): Promise<ShareResult> {
  if (!isSupabaseConfigured) return { error: new Error(OFFLINE_ERROR) };

  const patch: Record<string, unknown> = { status };
  if (status === 'accepted') {
    patch.accepted_at = new Date().toISOString();
    patch.accepted_week_key = acceptedWeekKey ?? null;
    patch.accepted_day_index = acceptedDayIndex ?? null;
  }

  const { data, error } = await supabase
    .from('shared_workouts')
    .update(patch)
    .eq('id', shareId)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.error('[shareService] respondToShare error:', error);
    return { error: new Error(error.message) };
  }
  if (!data || data.length === 0) {
    return {
      error: new Error('To udostępnienie zostało już rozpatrzone.'),
      alreadyHandled: true,
    };
  }
  return { error: null };
}

/** Anuluje oczekujące udostępnienie (nadawca). */
export async function deleteShare(shareId: string): Promise<ShareResult> {
  if (!isSupabaseConfigured) return { error: new Error(OFFLINE_ERROR) };

  const { data, error } = await supabase
    .from('shared_workouts')
    .delete()
    .eq('id', shareId)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.error('[shareService] deleteShare error:', error);
    return { error: new Error(error.message) };
  }
  if (!data || data.length === 0) {
    return {
      error: new Error('Nie można anulować tego udostępnienia.'),
      alreadyHandled: true,
    };
  }
  return { error: null };
}

// ─── Migawka dnia ───────────────────────────────────────────────────────────

/**
 * Buduje migawkę dnia do udostępnienia.
 *
 * Świadomie NIE kopiujemy:
 *  - `note` — to prywatna notatka nadawcy o serii (np. „ból kolana");
 *    usuwamy ją ZANIM dane opuszczą przeglądarkę nadawcy, więc w bazie
 *    nigdy nie leży;
 *  - `done` — resetujemy do false, bo trening ma być do wykonania;
 *  - `id` — nadawca nadaje nowe identyfikatory przy odbiorze.
 *
 * `weight` i `actualReps` zostawiamy jako referencję — spójnie z istniejącym
 * przyciskiem „Kopiuj trening", który też zachowuje wagę, a resetuje ✓.
 */
export function buildDaySnapshot(day: WorkoutDay): SharedDaySnapshot {
  return {
    exercises: (day.exercises ?? []).map(ex => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      difficulty: ex.difficulty,
      description: ex.description,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      duration: ex.duration,
      restTime: ex.restTime,
      requiredEquipment: ex.requiredEquipment,
      setLogs: (ex.setLogs ?? []).map(log => ({
        setNumber: log.setNumber,
        targetReps: log.targetReps,
        actualReps: log.actualReps ?? null,
        weight: log.weight ?? null,
      })),
    })),
  };
}

/**
 * Odtwarza ćwiczenia z migawki udostępnionego dnia.
 *
 * Identyfikatory są tymczasowe — docelowe nadaje `copyWorkoutToDay()`
 * (klucze Reacta muszą być unikalne w obrębie dnia).
 */
export function snapshotToExercises(snapshot: SharedDaySnapshot | null | undefined): Exercise[] {
  const list = Array.isArray(snapshot?.exercises) ? snapshot.exercises : [];
  return list.map((ex, i) => ({
    id: `shared-${i}`,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    difficulty: ex.difficulty,
    description: ex.description,
    sets: ex.sets,
    reps: ex.reps,
    weight: ex.weight,
    duration: ex.duration,
    restTime: ex.restTime,
    requiredEquipment: ex.requiredEquipment,
    setLogs: (ex.setLogs ?? []).map((log, j) => ({
      id: `shared-set-${i}-${j}`,
      setNumber: log.setNumber,
      targetReps: log.targetReps,
      actualReps: log.actualReps ?? null,
      weight: log.weight ?? null,
      done: false,
    })),
  }));
}
