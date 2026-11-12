import { useState, useCallback, useEffect } from 'react';
import {
  addFavoriteRemote,
  fetchFavoriteIds,
  removeFavoriteRemote,
} from '../lib/favoritesService';

/**
 * Ulubione ćwiczenia — synchronizowane z Supabase.
 *
 * Model „offline-first”:
 *  • stan w React + localStorage = natychmiastowa reakcja UI (działa offline),
 *  • Supabase = źródło prawdy między urządzeniami,
 *  • kolejka `pending` trzyma operacje wykonane offline (dodanie/usunięcie),
 *    które zostaną dołożone do chmury przy najbliższym połączeniu.
 *
 * Dzięki temu usunięcie ćwiczenia na jednym urządzeniu znika też
 * na drugim (operacja „remove" nie jest nigdy nadpisywana przez
 * lokalną listę przy syncowaniu).
 */

const STORAGE_PREFIX = 'fitplanner-favorites';

/**
 * Identyfikator trybu demo.
 *
 * W demo nie ma prawdziwego konta w chmurze — odpytywanie bazy z id
 * „demo" kończy się błędem formatu uuid, który wygląda jak awaria
 * chmury. Dlatego demo w ogóle nie synchronizuje się z chmurą
 * (tak jak `templateStore` i `shareStore`).
 */
const DEMO_USER_ID = 'demo';

interface PendingOps {
  adds: string[];
  removes: string[];
}

function storageKey(userId?: string): string {
  return `${STORAGE_PREFIX}-${userId ?? 'demo'}`;
}

function pendingKey(userId?: string): string {
  return `${STORAGE_PREFIX}-pending-${userId ?? 'demo'}`;
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

function saveFavorites(userId: string | undefined, ids: string[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(ids));
  } catch {
    // brak miejsca w localStorage — lista zostaje tylko w pamięci sesji
  }
}

function loadPending(userId?: string): PendingOps {
  try {
    const raw = localStorage.getItem(pendingKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adds: Array.isArray(parsed?.adds) ? parsed.adds : [],
        removes: Array.isArray(parsed?.removes) ? parsed.removes : [],
      };
    }
  } catch {
    // uszkodzony JSON — pusta kolejka
  }
  return { adds: [], removes: [] };
}

function savePending(userId: string | undefined, pending: PendingOps) {
  try {
    localStorage.setItem(pendingKey(userId), JSON.stringify(pending));
  } catch {
    // brak miejsca — kolejka zostaje tylko w pamięci sesji
  }
}

export function useFavoritesStore(userId?: string) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadFavorites(userId));
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const apply = useCallback((ids: string[]) => {
    setFavoriteIds(ids);
    saveFavorites(userId, ids);
  }, [userId]);

  /**
   * Synchronizacja z chmurą:
   *  1. doklada oczekujące operacje,
   *  2. pobiera aktualny stan z bazy,
   *  3. zapisuje go lokalnie.
   */
  const sync = useCallback(async () => {
    // Tryb demo nie synchronizuje się z chmurą (brak prawdziwego konta).
    if (!userId || userId === DEMO_USER_ID) return;

    setIsSyncing(true);
    try {
      // 1. Dołóż oczekujące operacje (dodania i usunięcia)
      const pending = loadPending(userId);
      if (pending.adds.length || pending.removes.length) {
        const doneAdds: string[] = [];
        const doneRemoves: string[] = [];

        for (const id of pending.adds) {
          const err = await addFavoriteRemote(userId, id);
          if (err) break; // brak sieci — reszta zostaje w kolejce
          doneAdds.push(id);
        }
        for (const id of pending.removes) {
          const err = await removeFavoriteRemote(userId, id);
          if (err) break;
          doneRemoves.push(id);
        }

        // Z kolejki usuwamy TYLKO potwierdzone operacje — nieudane muszą
        // zostać, żeby trafić do chmury przy następnym połączeniu.
        savePending(userId, {
          adds: pending.adds.filter(id => !doneAdds.includes(id)),
          removes: pending.removes.filter(id => !doneRemoves.includes(id)),
        });
      }

      // 2. Pobierz stan z bazy
      const remote = await fetchFavoriteIds(userId);
      if (remote !== null) {
        apply(remote);
        setSynced(true);
      }
    } catch (err) {
      console.error('[favoritesStore] sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, apply]);

  // Synchronizacja przy zmianie użytkownika (logowanie / wylogowanie)
  useEffect(() => {
    if (!userId) {
      setFavoriteIds(loadFavorites(undefined));
      setSynced(false);
      return;
    }
    setFavoriteIds(loadFavorites(userId));
    sync();
  }, [userId, sync]);

  // Dodatkowe odświeżenie przy powrocie do aplikacji
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, sync]);

  const toggleFavorite = useCallback((id: string) => {
    const isNowFavorite = !favoriteIds.includes(id);

    // 1. Natychmiastowa zmiana w UI + localStorage
    const next = isNowFavorite
      ? [...favoriteIds, id]
      : favoriteIds.filter(x => x !== id);
    apply(next);

    // 2. Operacja trafia do kolejki (przetrwa brak sieci)
    const pending = loadPending(userId);
    if (isNowFavorite) {
      pending.adds = [...new Set([...pending.adds.filter(x => x !== id), id])];
      pending.removes = pending.removes.filter(x => x !== id);
    } else {
      pending.removes = [...new Set([...pending.removes.filter(x => x !== id), id])];
      pending.adds = pending.adds.filter(x => x !== id);
    }
    savePending(userId, pending);

    // 3. Wyślij do chmury
    if (!userId) return;
    (async () => {
      const err = isNowFavorite
        ? await addFavoriteRemote(userId, id)
        : await removeFavoriteRemote(userId, id);
      if (err) {
        // Operacja zostaje w kolejce i wyjdzie przy najbliższym syncowaniu.
        console.warn('[favoritesStore] Nie udało się zapisać w chmurze:', err.message);
        return;
      }
      const p = loadPending(userId);
      if (isNowFavorite) p.adds = p.adds.filter(x => x !== id);
      else p.removes = p.removes.filter(x => x !== id);
      savePending(userId, p);
    })();
  }, [favoriteIds, userId, apply]);

  const isFavorite = useCallback((id: string) => favoriteIds.includes(id), [favoriteIds]);

  const clearFavorites = useCallback(() => {
    const ids = favoriteIds;
    apply([]);
    if (!userId) return;

    // Usunięcia też trafiają do kolejki — jeśli zapis się nie uda,
    // powtórzymy go przy następnym syncowaniu.
    const pending = loadPending(userId);
    pending.removes = [...new Set([...pending.removes, ...ids])];
    pending.adds = pending.adds.filter(id => !ids.includes(id));
    savePending(userId, pending);

    ids.forEach(id => {
      removeFavoriteRemote(userId, id).then(err => {
        if (err) return;
        const p = loadPending(userId);
        p.removes = p.removes.filter(x => x !== id);
        savePending(userId, p);
      });
    });
  }, [favoriteIds, userId, apply]);

  return {
    favoriteIds,
    favoriteCount: favoriteIds.length,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    sync,
    isSyncing,
    synced,
  };
}
