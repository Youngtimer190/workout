import { useState, useCallback, useEffect } from 'react';

/**
 * Ulubione ćwiczenia.
 *
 * Trzymane lokalnie w localStorage (klucz zależny od użytkownika), więc
 * działają też offline i w trybie demo. Cloud sync ulubionych wymagałby
 * osobnej tabeli w Supabase — na razie świadomie zostawiamy to lokalnie.
 */

const STORAGE_PREFIX = 'fitplanner-favorites';

function storageKey(userId?: string): string {
  return `${STORAGE_PREFIX}-${userId ?? 'demo'}`;
}

function loadFavorites(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(id => typeof id === 'string');
    }
  } catch {
    // uszkodzony JSON — traktujemy jak brak ulubionych
  }
  return [];
}

export function useFavoritesStore(userId?: string) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavorites(userId));

  // Przy zmianie użytkownika (lub wylogowaniu) przeładowujemy listę
  useEffect(() => {
    setFavoriteIds(loadFavorites(userId));
  }, [userId]);

  const persist = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(ids));
    } catch {
      // brak miejsca w localStorage — lista zostaje tylko w pamięci sesji
    }
  }, [userId]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      persist(next);
      return next;
    });
  }, [persist]);

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  const clearFavorites = useCallback(() => {
    setFavoriteIds([]);
    persist([]);
  }, [persist]);

  return {
    favoriteIds,
    favoriteCount: favoriteIds.length,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}
