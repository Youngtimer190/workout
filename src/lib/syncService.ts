/**
 * Sync service — synchronizuje dane treningu między localStorage a Supabase.
 * Działa w trybie "offline-first": zmiany zapisywane lokalnie natychmiast,
 * a następnie synchronizowane z bazą w tle.
 */
import { logCloudIssue, markCloudFailed, markCloudOk, isNetworkError } from './cloudStatus';
import { supabase, isSupabaseConfigured } from './supabase';
import { WorkoutDay, Exercise } from '../types';

// ─── Week Plans ──────────────────────────────────────────────────────────────

/** Wynik pobrania tygodnia — rozróżnia „nie ma takiego tygodnia" od błędu. */
export interface WeekPlanFetchResult {
  days: WorkoutDay[] | null;
  error: Error | null;
}

/**
 * Pobiera tydzień z chmury.
 *
 * `maybeSingle()` (a nie `single()`) odróżnia „nie ma takiego tygodnia"
 * (błąd PGRST116) od prawdziwego błędu sieci/RLS. To rozróżnienie jest
 * istotne: przy błędzie nie wolno nadpisywać chmury danymi z localStorage,
 * bo skasowałoby to trening zapisany na innym urządzeniu.
 */
/**
 * Limit czasu dla odczytów z chmury.
 *
 * Bez tego wisząca baza zatrzymuje aplikację na szkieletcie w nieskończoność
 * (synchroniczacja nigdy się nie kończy, `finally` nie wypala).
 */
const CLOUD_TIMEOUT_MS = 10_000;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(CLOUD_TIMEOUT_MS);
}

export async function fetchWeekPlan(userId: string, weekKey: string): Promise<WeekPlanFetchResult> {
  if (!isSupabaseConfigured) return { days: null, error: null };
  try {
    const { data, error } = await supabase
      .from('week_plans')
      .select('days_data')
      .eq('user_id', userId)
      .eq('week_key', weekKey)
      .abortSignal(timeoutSignal())
      .maybeSingle();
    if (error) {
      logCloudIssue('syncService:fetchWeekPlan', error);
      markCloudFailed(error.message);
      return { days: null, error: new Error(error.message) };
    }
    markCloudOk();
    if (!data) return { days: null, error: null };
    return { days: data.days_data as WorkoutDay[], error: null };
  } catch (err) {
    // Wisząca baza albo przerwane połączenie — nie zostawiamy wywołującego
    // z niewykonanym żądaniem w nieskończoność.
    logCloudIssue('syncService:fetchWeekPlan', err);
    markCloudFailed(err instanceof Error ? err.message : String(err));
    return { days: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Wczytuje WSZYSTKIE zapisane tygodnie użytkownika jednym zapytaniem.
 *
 * Potrzebne do statystyk na pulpicie (treningi w miesiącu, passa tygodni,
 * wolumen od początku) — w pamięci aplikacji jest tylko bieżący tydzień.
 *
 * Tabela `week_plans` ma jeden wiersz na tydzień, więc jeden `select`
 * zwraca całą historię.
 */
export async function fetchAllWeekPlans(userId: string): Promise<Record<string, WorkoutDay[]>> {
  if (!isSupabaseConfigured) return {};

  // Timeout: gdy baza nie odpowiada, nie blokujemy statystyk — zostają dane
  // lokalne, a odczyt ponowi się przy następnym wejściu.
  let data: { week_key: string; days_data: unknown }[] | null = null;
  let error: { message: string } | null = null;

  try {
    const res = await supabase
      .from('week_plans')
      .select('week_key, days_data')
      .eq('user_id', userId)
      .order('week_key', { ascending: true })
      .abortSignal(timeoutSignal());
    data = res.data as { week_key: string; days_data: unknown }[] | null;
    error = res.error as { message: string } | null;
  } catch (err) {
    logCloudIssue('syncService:fetchAllWeekPlans', err);
    markCloudFailed(err instanceof Error ? err.message : String(err));
    return {};
  }

  if (error) {
    logCloudIssue('syncService:fetchAllWeekPlans', error);
    markCloudFailed(error.message);
    return {};
  }
  markCloudOk();

  const weeks: Record<string, WorkoutDay[]> = {};
  for (const row of data ?? []) {
    const key = row.week_key as string;
    const days = row.days_data as WorkoutDay[] | null;
    if (key && Array.isArray(days)) weeks[key] = days;
  }
  return weeks;
}

/**
 * Zapisuje tydzień do chmury.
 *
 * Zwraca `Error` przy niepowodzeniu (albo `null` przy sukcesie) — samo
 * „nie rzuciło wyjątku" nie znaczy, że dane zostały zapisane.
 */
export async function upsertWeekPlan(userId: string, weekKey: string, days: WorkoutDay[]): Promise<Error | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { error } = await supabase
      .from('week_plans')
      .upsert(
        { user_id: userId, week_key: weekKey, days_data: days, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,week_key' }
      )
      .abortSignal(timeoutSignal());
    if (error) {
      logCloudIssue('syncService:upsertWeekPlan', error);
      if (isNetworkError(error)) markCloudFailed(error.message);
      return new Error(error.message);
    }
    markCloudOk();
    return null;
  } catch (err) {
    logCloudIssue('syncService:upsertWeekPlan', err);
    markCloudFailed(err instanceof Error ? err.message : String(err));
    return err instanceof Error ? err : new Error(String(err));
  }
}

export async function fetchAllWeekKeys(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('week_plans')
    .select('week_key')
    .eq('user_id', userId)
    .order('week_key', { ascending: false })
    .abortSignal(timeoutSignal());
  return (data ?? []).map((r: { week_key: string }) => r.week_key);
}

// ─── Custom Exercises ─────────────────────────────────────────────────────────

export async function fetchCustomExercises(userId: string): Promise<Exercise[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('custom_exercises')
    .select('exercise_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .abortSignal(timeoutSignal());
  if (error) {
    logCloudIssue('syncService:fetchCustomExercises', error);
    markCloudFailed(error.message);
    return [];
  }
  if (!data) return [];
  markCloudOk();
  return data.map((r: { exercise_data: Exercise }) => r.exercise_data);
}

export async function upsertCustomExercise(userId: string, exercise: Exercise): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('custom_exercises').upsert(
    {
      user_id: userId,
      exercise_id: exercise.id,
      exercise_data: exercise,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,exercise_id' }
  );
}

export async function deleteCustomExerciseRemote(userId: string, exerciseId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('custom_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId);
}

// ─── Full data sync on login ──────────────────────────────────────────────────

export async function syncAllDataFromCloud(userId: string): Promise<{
  weeks: Record<string, WorkoutDay[]>;
  customExercises: Exercise[];
  /**
   * Czy odczyt z chmury się udał.
   *
   * WAŻNE: gdy `ok` jest fałszywe, zwracamy puste dane — ale wołający NIE
   * może wtedy nadpisywać nimi danych lokalnych (kasowałby trening
   * zapisany na tym urządzeniu).Dlatego sygnalizujemy to flagą.
   */
  ok: boolean;
}> {
  if (!isSupabaseConfigured) return { weeks: {}, customExercises: [], ok: false };

  try {
    const [plans, exercises] = await Promise.all([
      supabase.from('week_plans').select('week_key, days_data').eq('user_id', userId).abortSignal(timeoutSignal()),
      supabase.from('custom_exercises').select('exercise_data').eq('user_id', userId).order('created_at', { ascending: true }).abortSignal(timeoutSignal()),
    ]);

    const error = plans.error ?? exercises.error;
    if (error) {
      logCloudIssue('syncService:syncAllDataFromCloud', error);
      markCloudFailed(error.message);
      return { weeks: {}, customExercises: [], ok: false };
    }
    markCloudOk();

    const weeks: Record<string, WorkoutDay[]> = {};
    (plans.data ?? []).forEach((r: { week_key: string; days_data: WorkoutDay[] }) => {
      weeks[r.week_key] = r.days_data;
    });

    const customExercises: Exercise[] = (exercises.data ?? []).map(
      (r: { exercise_data: Exercise }) => r.exercise_data
    );

    return { weeks, customExercises, ok: true };
  } catch (err) {
    logCloudIssue('syncService:syncAllDataFromCloud', err);
    markCloudFailed(err instanceof Error ? err.message : String(err));
    return { weeks: {}, customExercises: [], ok: false };
  }
}

// ─── Push all local data to cloud (first login) ──────────────────────────────

export async function pushLocalDataToCloud(
  userId: string,
  weeks: Record<string, WorkoutDay[]>,
  customExercises: Exercise[]
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const weekUpserts = Object.entries(weeks).map(([week_key, days_data]) => ({
    user_id: userId,
    week_key,
    days_data,
    updated_at: new Date().toISOString(),
  }));

  const exerciseUpserts = customExercises.map(exercise => ({
    user_id: userId,
    exercise_id: exercise.id,
    exercise_data: exercise,
    updated_at: new Date().toISOString(),
  }));

  await Promise.all([
    weekUpserts.length > 0
      ? supabase.from('week_plans').upsert(weekUpserts, { onConflict: 'user_id,week_key' })
      : Promise.resolve(),
    exerciseUpserts.length > 0
      ? supabase.from('custom_exercises').upsert(exerciseUpserts, { onConflict: 'user_id,exercise_id' })
      : Promise.resolve(),
  ]);
}
