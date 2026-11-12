/**
 * Zarchiwizowane udostępnienia — osobista, lokalna lista.
 *
 * „Archiwizacja” to decyzja WYGLĄDU, nie usunięcie danych:
 *  • użytkownik nie traci informacji, że dany trening przyjął (i gdzie wylądował),
 *  • druga strona udostępnienia nie wie o tym — archiwizujemy tylko przed sobą.
 *
 * Trzymamy to w localStorage (osobno dla każdego konta), bo:
 *  • nie wymaga migracji bazy i nowych polityk RLS,
 *  • działa natychmiast i offline,
 *  • RLS i tak nie pozwala usuwać przetworzonych wierszy — a archiwizacja
 *    daje ten sam efekt dla użytkownika.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY_PREFIX = 'fitplanner-archived-shares';
/** Poprzednia nazwa klucza — migrujemy ją przy pierwszym odczycie. */
const LEGACY_KEY_PREFIX = 'fitplanner-hidden-shares';

function storageKey(userId?: string | null): string {
  return `${KEY_PREFIX}:${userId || 'demo'}`;
}

function legacyStorageKey(userId?: string | null): string {
  return `${LEGACY_KEY_PREFIX}:${userId || 'demo'}`;
}

export function useArchivedShares(userId?: string | null) {
  const [archivedIds, setArchivedIds] = useState<string[]>([]);

  // Wczytanie przy zmianie konta (żeby nie mieszać danych dwóch osób).
  useEffect(() => {
    try {
      let raw = localStorage.getItem(storageKey(userId));
      // Migracja ze starego klucza (gdy lista była jeszcze „ukryta”).
      if (!raw) {
        const legacy = localStorage.getItem(legacyStorageKey(userId));
        if (legacy) {
          raw = legacy;
          localStorage.setItem(storageKey(userId), legacy);
        }
      }
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setArchivedIds(Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []);
    } catch {
      setArchivedIds([]);
    }
  }, [userId]);

  const persist = useCallback((next: string[]) => {
    setArchivedIds(next);
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch {
      /* brak dostępu do localStorage — archiwum działa tylko w sesji */
    }
  }, [userId]);

  /** Archiwizuje udostępnienie — znika z listy, ale pozostaje do przywrócenia. */
  const archive = useCallback((id: string) => {
    setArchivedIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [userId]);

  /** Przywraca udostępnienie z archiwum. */
  const restore = useCallback((id: string) => {
    setArchivedIds(prev => {
      const next = prev.filter(x => x !== id);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [userId]);

  /** Czyści całe archiwum. */
  const clearAll = useCallback(() => persist([]), [persist]);

  return { archivedIds, archive, restore, clearAll };
}
