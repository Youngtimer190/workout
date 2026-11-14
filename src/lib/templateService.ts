/**
 * Template service – zarządza szablonami treningów w Supabase.
 * Działa na kluczu `anon` z sesją użytkownika – pod ochroną RLS.
 */
import { logCloudIssue, markCloudFailed, markCloudOk } from './cloudStatus';
import { supabase, isSupabaseConfigured } from './supabase';
import { WorkoutTemplate, normalizeTemplateCategory } from '../types';

/**
 * Czy baza ma kolumny `pinned` / `last_used_at`.
 *
 * `null` = jeszcze nie wiemy (brak zapisu szablonu w tej sesji).
 *
 * UWAGA: PostgREST cicho pomija nieznane kolumny w `SELECT` i `UPDATE`
 * (błąd „PGRST204” pojawia się dopiero przy `INSERT`). Dlatego nie da się
 * wykryć braku kolumn sondą `select(...)` — jedynym wiarygodnym sygnałem
 * jest błąd upsertu, dlatego stan aktualizujemy właśnie tam.
 */
let flagColumnsSupported: boolean | null = null;

/** Czy kolumny flag są dostępne w bazie (null = jeszcze nie wiemy). */
export function areTemplateFlagColumnsSupported(): boolean | null {
  return flagColumnsSupported;
}
export async function fetchTemplates(userId: string): Promise<WorkoutTemplate[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    logCloudIssue('templateService:fetchTemplates', error);
    markCloudFailed(error.message);
    return [];
  }
  markCloudOk();
  // Map database fields to frontend interface
  // DB: id (UUID), template_id (string), created_at, updated_at
  // Frontend: id (template_id), createdAt, updatedAt
  return (data ?? []).map(row => ({
    id: row.template_id,
    name: row.name,
    description: row.description ?? '',
    exercises: row.exercises ?? [],
    color: row.color ?? 'bg-cyan-500',
    category: normalizeTemplateCategory(row.category),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Kolumny `pinned` / `last_used_at` mogą nie istnieć, jeśli skrypt
    // SUPABASE_SETUP_TEMPLATES_V2.sql nie został wykonany — wtedy wracają
    // jako undefined i wartości lokalne zostają zachowane.
    pinned: row.pinned ?? undefined,
    lastUsedAt: row.last_used_at ?? null,
  })) as WorkoutTemplate[];
}

export async function upsertTemplate(userId: string, template: WorkoutTemplate): Promise<Error | null> {
  if (!isSupabaseConfigured) return null;

  const base = {
    user_id: userId,
    template_id: template.id,
    name: template.name,
    description: template.description,
    exercises: template.exercises,
    color: template.color,
    category: template.category,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };

  // Pełny payload (z `pinned` i `last_used_at`).
  const { error } = await supabase.from('workout_templates').upsert(
    {
      ...base,
      pinned: !!template.pinned,
      last_used_at: template.lastUsedAt ?? null,
    },
    { onConflict: 'user_id,template_id' }
  );

  if (!error) {
    flagColumnsSupported = true;
    return null;
  }

  // Baza nie ma jeszcze kolumn `pinned` / `last_used_at` (skrypt
  // SUPABASE_SETUP_TEMPLATES_V2.sql nie został wykonany) — wtedy
  // PostgREST odrzuca payload. Ponawiamy bez nowych pól, żeby
  // synchronizacja szablonów działała mimo nieuruchomionego skryptu.
  const isMissingColumn =
    error.code === 'PGRST204' ||
    error.code === '42703' ||
    /column .* does not exist/i.test(error.message ?? '');

  if (!isMissingColumn) {
    console.error('[templateService] upsertTemplate error:', error);
    return new Error(error.message);
  }

  // Baza nie ma kolumn flag — zapamiętujemy, żeby nie próbować ponownie
  // (i żeby aplikacja poinformowała użytkownika tylko RAZ).
  flagColumnsSupported = false;

  const retry = await supabase.from('workout_templates').upsert(
    base,
    { onConflict: 'user_id,template_id' }
  );
  if (retry.error) {
    console.error('[templateService] upsertTemplate error:', retry.error);
    return new Error(retry.error.message);
  }
  return null;
}

/** Wynik zapisu flag szablonu. */
export interface TemplateFlagsResult {
  /** Czy flagi trafiły do bazy. */
  saved: boolean;
  /** Czy w bazie brakuje kolumn `pinned` / `last_used_at`. */
  missingColumns: boolean;
}

/**
 * Aktualizuje flagi szablonu (przypięcie / ostatnie użycie).
 *
 * Operacja „best effort” — jeśli w bazie nie ma odpowiednich kolumn,
 * flagi i tak zostają w pamięci lokalnej i wracają po odświeżeniu danych.
 */
export async function updateTemplateFlags(
  userId: string,
  templateId: string,
  flags: { pinned?: boolean; lastUsedAt?: string | null }
): Promise<TemplateFlagsResult> {
  if (!isSupabaseConfigured) return { saved: false, missingColumns: false };

  // Wiemy już, że kolumn nie ma — nie wysyłamy bezcelowego żądania.
  if (flagColumnsSupported === false) {
    return { saved: false, missingColumns: true };
  }

  const patch: Record<string, unknown> = {};
  if (flags.pinned !== undefined) patch.pinned = flags.pinned;
  if (flags.lastUsedAt !== undefined) patch.last_used_at = flags.lastUsedAt;
  if (Object.keys(patch).length === 0) return { saved: false, missingColumns: false };

  const { error } = await supabase
    .from('workout_templates')
    .update(patch)
    .eq('user_id', userId)
    .eq('template_id', templateId);

  if (error) {
    // Brak kolumn w bazie — nie jest to błąd krytyczny, tylko brak
    // synchronizacji flagi między urządzeniami.
    const missingColumns = error.code === 'PGRST204' || error.code === '42703';
    if (missingColumns) {
      flagColumnsSupported = false;
    } else {
      console.error('[templateService] updateTemplateFlags error:', error);
    }
    return { saved: false, missingColumns };
  }
  return { saved: true, missingColumns: false };
}
export async function deleteTemplateRemote(userId: string, templateId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('workout_templates')
    .delete()
    .eq('user_id', userId)
    .eq('template_id', templateId);
}