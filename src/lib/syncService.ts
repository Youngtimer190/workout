/**
 * Sync service — synchronizuje dane treningu między localStorage a Supabase.
 * Działa w trybie "offline-first": zmiany zapisywane lokalnie natychmiast,
 * a następnie synchronizowane z bazą w tle.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { WorkoutDay, Exercise } from '../types';

// ─── Week Plans ──────────────────────────────────────────────────────────────

export async function fetchWeekPlan(userId: string, weekKey: string): Promise<WorkoutDay[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('week_plans')
    .select('days_data')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
    .single();
  if (error || !data) return null;
  return data.days_data as WorkoutDay[];
}

export async function upsertWeekPlan(userId: string, weekKey: string, days: WorkoutDay[]): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.from('week_plans').upsert(
    { user_id: userId, week_key: weekKey, days_data: days, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,week_key' }
  );
}

export async function fetchAllWeekKeys(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from('week_plans')
    .select('week_key')
    .eq('user_id', userId)
    .order('week_key', { ascending: false });
  return (data ?? []).map((r: { week_key: string }) => r.week_key);
}

// ─── Custom Exercises ─────────────────────────────────────────────────────────

export async function fetchCustomExercises(userId: string): Promise<Exercise[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('custom_exercises')
    .select('exercise_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
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
}> {
  if (!isSupabaseConfigured) return { weeks: {}, customExercises: [] };

  const [{ data: plansData }, { data: exercisesData }] = await Promise.all([
    supabase.from('week_plans').select('week_key, days_data').eq('user_id', userId),
    supabase.from('custom_exercises').select('exercise_data').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  const weeks: Record<string, WorkoutDay[]> = {};
  (plansData ?? []).forEach((r: { week_key: string; days_data: WorkoutDay[] }) => {
    weeks[r.week_key] = r.days_data;
  });

  const customExercises: Exercise[] = (exercisesData ?? []).map(
    (r: { exercise_data: Exercise }) => r.exercise_data
  );

  return { weeks, customExercises };
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
