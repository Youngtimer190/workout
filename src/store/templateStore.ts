/**
 * Store szablonów treningów.
 *
 * Szablony trzymamy lokalnie (localStorage, KLUCZ PER KONTO) i synchronizujemy
 * z chmurą przez `templateService` — ta sama zasada co przy planie tygodnia:
 * lokalnie działa natychmiast, w chmurze jest backup między urządzeniami.
 *
 * Klucz per konto (a nie jeden globalny) ma dwie zalety:
 *  • wylogowanie nie kasuje szablonów innego użytkownika,
 *  • tryb demo (konto „demo”) nie zgaduje się z realnym kontem.
 */
import { useState, useCallback, useEffect } from 'react';
import { WorkoutTemplate } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchTemplates,
  upsertTemplate,
  updateTemplateFlags,
  deleteTemplateRemote,
  areTemplateFlagColumnsSupported,
} from '../lib/templateService';

const TEMPLATES_STORAGE_KEY = 'workout-planner-templates';

/** Konto demo nie istnieje w bazie — z nim nie synchronizujemy. */
const DEMO_USER_ID = 'demo';

function storageKey(userId?: string | null): string {
  return `${TEMPLATES_STORAGE_KEY}:${userId || 'demo'}`;
}

function loadTemplatesLocal(userId?: string | null): WorkoutTemplate[] {
  try {
    const key = storageKey(userId);
    let raw = localStorage.getItem(key);
    // Migracja ze starego, wspólnego klucza — raz, przy pierwszym wejściu.
    if (!raw) {
      const legacy = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (legacy) {
        raw = legacy;
        try {
          localStorage.setItem(key, legacy);
          localStorage.removeItem(TEMPLATES_STORAGE_KEY);
        } catch {}
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveTemplatesLocal(templates: WorkoutTemplate[], userId?: string | null) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(templates));
  } catch {}
}

/**
 * Scalenie wierszy z chmury z lokalnymi ustawieniami.
 *
 * Kolumny `pinned` / `last_used_at` mogą nie istnieć w bazie (gdy skrypt
 * SUPABASE_SETUP_TEMPLATES_V2.sql nie został wykonany) — wtedy wiersz
 * z chmury nie niesie tych wartości i zachowujemy lokalne.
 */
function mergeTemplateMeta(cloud: WorkoutTemplate[], local: WorkoutTemplate[]): WorkoutTemplate[] {
  const localById = new Map(local.map(t => [t.id, t]));
  return cloud.map(t => {
    const l = localById.get(t.id);
    if (!l) return t;
    return {
      ...t,
      pinned: t.pinned ?? l.pinned ?? false,
      lastUsedAt: t.lastUsedAt ?? l.lastUsedAt ?? null,
    };
  });
}
/**
 * Czy już ostrzegaliśmy o brakujących kolumnach w bazie.
 *
 * Bez tego każde przypięcie szablonu wypisywałoby ten sam komunikat —
 * a komunikat ma być informacją, nie hałasem.
 */
let warnedAboutMissingColumns = false;

/**
 * Informuje RAZ na sesję, że flagi działają tylko lokalnie.
 *
 * Komunikat pojawia się dopiero wtedy, gdy wiemy to na pewno — baza
 * zgłosiła brak kolumn przy zapisie szablonu.
 */
function warnAboutMissingFlagColumns(): void {
  if (warnedAboutMissingColumns) return;
  if (areTemplateFlagColumnsSupported() !== false) return;
  warnedAboutMissingColumns = true;
  console.info(
    '[TemplateStore] Baza nie ma jeszcze kolumn `pinned` / `last_used_at` — przypięcia ',
      + 'i „ostatnio używane” działają tylko lokalnie. Uruchom '
      + 'SUPABASE_SETUP_TEMPLATES_V2.sql, aby syncowały się między urządzeniami.'
  );
}
function generateId(): string {
  return `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTemplateStore(userId?: string) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(() => !!isSupabaseConfigured);

  // ── Wczytanie + synchronizacja z chmurą przy zmianie konta ──
  useEffect(() => {
    if (!userId) {
      // Wylogowanie — nie kasujemy danych, są per konto; czyścimy widok.
      setTemplates([]);
      setIsHydrating(false);
      return;
    }

    // Najpierw dane lokalne tego konta — lista pojawia się natychmiast.
    const local = loadTemplatesLocal(userId);
    setTemplates(local);

    if (!isSupabaseConfigured) {
      setIsHydrating(false);
      return;
    }

    // Tryb demo: dane zostają lokalne (tak komunikuje baner demo),
    // więc nie nadpisujemy ich pustą odpowiedzią z chmury.
    if (userId === DEMO_USER_ID) {
      setIsHydrating(false);
      return;
    }

    const syncFromCloud = async () => {
      setLoading(true);
      try {
        const cloudTemplates = await fetchTemplates(userId);
        const merged = mergeTemplateMeta(cloudTemplates, local);
        saveTemplatesLocal(merged, userId);
        setTemplates(merged);
        setError(null);
      } catch (err) {
        console.error('[TemplateStore] Sync error:', err);
        setError('Nie udało się zsynchronizować szablonów');
      } finally {
        setLoading(false);
        setIsHydrating(false);
      }
    };

    syncFromCloud();
  }, [userId]);

  // ── Mutations ──

  const addTemplate = useCallback(async (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTemplate: WorkoutTemplate = {
      ...template,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    setTemplates(prev => {
      const next = [...prev, newTemplate];
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        await upsertTemplate(userId, newTemplate);
        warnAboutMissingFlagColumns();
      } catch (err) {
        console.error('[TemplateStore] addTemplate cloud error:', err);
      }
    }

    return newTemplate;
  }, [userId]);

  const updateTemplate = useCallback(async (updated: WorkoutTemplate) => {
    const now = new Date().toISOString();
    const templateWithTime = { ...updated, updatedAt: now };

    setTemplates(prev => {
      const next = prev.map(t => t.id === updated.id ? templateWithTime : t);
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        await upsertTemplate(userId, templateWithTime);
        warnAboutMissingFlagColumns();
      } catch (err) {
        console.error('[TemplateStore] updateTemplate cloud error:', err);
      }
    }
  }, [userId]);

  /** Przełącza przypięcie szablonu (i synchronizuje flagę z chmurą). */
  const setPinned = useCallback(async (id: string, pinned: boolean) => {
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, pinned } : t);
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        const result = await updateTemplateFlags(userId, id, { pinned });
        if (result.missingColumns) warnAboutMissingFlagColumns();
      } catch (err) {
        console.error('[TemplateStore] setPinned cloud error:', err);
      }
    }
  }, [userId]);

  /** Odnotowuje zastosowanie szablonu (data i godzina). */
  const markUsed = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setTemplates(prev => {
      const next = prev.map(t => t.id === id ? { ...t, lastUsedAt: now } : t);
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        const result = await updateTemplateFlags(userId, id, { lastUsedAt: now });
        if (result.missingColumns) warnAboutMissingFlagColumns();
      } catch (err) {
        console.error('[TemplateStore] markUsed cloud error:', err);
      }
    }
  }, [userId]);
  /**
   * Usuwa szablon i zwraca go, żeby caller mógł pokazać „Cofnij”.
   *
   * Wiersze w bazie też kasujemy — inaczej po ponownym zalogowaniu
   * usunięty szablon wróciłby z chmury.
   */
  const deleteTemplate = useCallback(async (id: string): Promise<WorkoutTemplate | null> => {
    const removed = templates.find(t => t.id === id) ?? null;

    setTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        await deleteTemplateRemote(userId, id);
      } catch (err) {
        console.error('[TemplateStore] deleteTemplate cloud error:', err);
      }
    }

    return removed;
  }, [templates, userId]);

  /** Przywraca usunięty szablon (cofnięcie akcji „Usuń”). */
  const restoreTemplate = useCallback(async (template: WorkoutTemplate) => {
    setTemplates(prev => {
      const next = [template, ...prev.filter(t => t.id !== template.id)];
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        await upsertTemplate(userId, template);
      } catch (err) {
        console.error('[TemplateStore] restoreTemplate cloud error:', err);
      }
    }
  }, [userId]);

  /** Tworzy kopię szablonu (z nowym id i nazwą „X (kopia)”). */
  const duplicateTemplate = useCallback(async (template: WorkoutTemplate): Promise<WorkoutTemplate> => {
    const now = new Date().toISOString();
    const copy: WorkoutTemplate = {
      ...template,
      id: generateId(),
      name: `${template.name} (kopia)`,
      createdAt: now,
      updatedAt: now,
      exercises: template.exercises.map(ex => ({ ...ex, id: `${ex.id}-copy-${Date.now()}` })),
    };

    setTemplates(prev => {
      const next = [copy, ...prev];
      saveTemplatesLocal(next, userId);
      return next;
    });

    if (userId && isSupabaseConfigured && userId !== DEMO_USER_ID) {
      try {
        await upsertTemplate(userId, copy);
      } catch (err) {
        console.error('[TemplateStore] duplicateTemplate cloud error:', err);
      }
    }

    return copy;
  }, [userId]);

  const refreshTemplates = useCallback(async () => {
    if (!userId || !isSupabaseConfigured || userId === DEMO_USER_ID) return;
    setLoading(true);
    try {
      const cloudTemplates = await fetchTemplates(userId);
      saveTemplatesLocal(cloudTemplates, userId);
      setTemplates(cloudTemplates);
      setError(null);
    } catch (err) {
      console.error('[TemplateStore] refresh error:', err);
      setError('Nie udało się odświeżyć szablonów');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Helpers ──
  const getTemplate = useCallback((id: string) => templates.find(t => t.id === id), [templates]);

  return {
    templates,
    loading,
    error,
    isHydrating,
    addTemplate,
    updateTemplate,
    setPinned,
    markUsed,
    deleteTemplate,
    restoreTemplate,
    duplicateTemplate,
    refreshTemplates,
    getTemplate,
  };
}
