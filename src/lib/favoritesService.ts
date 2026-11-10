/**
 * Favorites service — synchronizacja ulubionych ćwiczeń z Supabase.
 *
 * Działa na kluczu `anon` z sesją użytkownika — pod ochroną RLS.
 * W bazie trzymamy wyłącznie identyfikatory ćwiczeń; pełne dane
 * ćwiczenia są już w bibliotece aplikacji (`src/data/exercises.ts`).
 */
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Pobiera identyfikatory ulubionych ćwiczeń.
 *
 * Zwraca `null`, gdy nie da się połączyć z bazą (offline / brak konfiguracji)
 * — wtedy caller korzysta z lokalnej pamięci podręcznej.
 */
export async function fetchFavoriteIds(userId: string): Promise<string[] | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('favorite_exercises')
    .select('exercise_id')
    .eq('user_id', userId);
  if (error) {
    console.error('[favoritesService] fetchFavoriteIds error:', error);
    return null;
  }
  return (data ?? []).map(row => row.exercise_id as string);
}

/** Dodaje ćwiczenie do ulubionych (idempotentne). */
export async function addFavoriteRemote(userId: string, exerciseId: string): Promise<Error | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.from('favorite_exercises').upsert(
    { user_id: userId, exercise_id: exerciseId },
    { onConflict: 'user_id,exercise_id' }
  );
  if (error) {
    console.error('[favoritesService] addFavoriteRemote error:', error);
    return new Error(error.message);
  }
  return null;
}

/** Usuwa ćwiczenie z ulubionych. */
export async function removeFavoriteRemote(userId: string, exerciseId: string): Promise<Error | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase
    .from('favorite_exercises')
    .delete()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId);
  if (error) {
    console.error('[favoritesService] removeFavoriteRemote error:', error);
    return new Error(error.message);
  }
  return null;
}
