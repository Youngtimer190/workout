import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Brak zmiennych środowiskowych VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY. ' +
    'Aplikacja działa w trybie offline (localStorage). ' +
    'Utwórz plik .env.local z poprawnymi kluczami aby włączyć synchronizację.'
  );
}

// ─── Przechowywanie sesji w IndexedDB (bardziej trwałe niż localStorage) ──────
// PWA na iOS/Android mogą czyścić localStorage przy restarcie, ale IndexedDB
// częściej przetrwa. To umożliwia dłuższe okno sesji.
const SESSION_STORAGE_KEY = 'fitplaner-auth-token';

interface SessionStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: { id: string; email: string | null } | null;
}

// IndexedDB helpers dla trwałego przechowywania sesji
const SESSION_DB_NAME = 'fitplaner-session-db';
const SESSION_STORE_NAME = 'sessions';

async function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SESSION_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
        db.createObjectStore(SESSION_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveSessionToIndexedDB(session: SessionStorage): Promise<void> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(SESSION_STORE_NAME, 'readwrite');
    tx.objectStore(SESSION_STORE_NAME).put(session);
    await tx.complete;
    db.close();
  } catch (err) {
    console.warn('[Supabase] Nie udało się zapisać sesji do IndexedDB:', err);
  }
}

async function loadSessionFromIndexedDB(): Promise<SessionStorage | null> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(SESSION_STORE_NAME, 'readonly');
    const request = tx.objectStore(SESSION_STORE_NAME).get('default');
    const result = await new Promise<SessionStorage | undefined>((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });
    db.close();
    return result ?? null;
  } catch (err) {
    console.warn('[Supabase] Nie udało się wczytać sesji z IndexedDB:', err);
    return null;
  }
}

async function clearSessionFromIndexedDB(): Promise<void> {
  try {
    const db = await openSessionDB();
    const tx = db.transaction(SESSION_STORE_NAME, 'readwrite');
    tx.objectStore(SESSION_STORE_NAME).delete('default');
    await tx.complete;
    db.close();
  } catch (err) {
    console.warn('[Supabase] Nie udało się wyczyścić sesji z IndexedDB:', err);
  }
}

// Custom storage implementation łącząca localStorage (fallback) z IndexedDB
const customSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // Najpierw sprawdź localStorage (szybszy dostęp)
    const localItem = localStorage.getItem(key);
    if (localItem) return localItem;

    // Fallback: IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const session = await loadSessionFromIndexedDB();
      if (session?.accessToken) {
        return JSON.stringify({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt,
          user: session.user,
        });
      }
    }
    return null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);

      // Zapisz do IndexedDB jako backup
      const session: SessionStorage = JSON.parse(value);
      if (session.accessToken) {
        await saveSessionToIndexedDB({
          ...session,
          id: 'default',
          user: session.user ?? { id: '', email: null },
        });
      }
    } catch (err) {
      console.warn('[Supabase] Nie udało się zapisać sesji:', err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
    await clearSessionFromIndexedDB();
  },
};

// ─── Klient standardowy (anon key) ───────────────────────────────────────────
// Używany do wszystkich normalnych operacji: auth, odczyt/zapis danych.
// UWAGA: klucz service_role NIE MOŻE być importowany w kodzie frontendu —
// build (vite-plugin-singlefile) wbudowuje wszystkie zmienne VITE_* do
// publicznego bundle, więc klucz z service_role byłby widoczny dla każdego
// odwiedzającego i dawałby pełny dostęp do bazy z pominięciem RLS.
// Operacje wymagające uprawnień admina (np. usunięcie konta) wykonuje
// funkcja SQL SECURITY DEFINER — patrz SUPABASE_SETUP.md.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: SESSION_STORAGE_KEY,
      // Ustaw dłuższy timeout dla sesji (domyślnie 60min)
      // To pozwala aplikacji działać dłużej zanim wymaga ponownego logowania
      flowType: 'pkce', // Bezpieczniejszy flow dla PWA
      // Rozszerzony czas życia session
      sessionTimeout: 60 * 60 * 24 * 7, // 7 dni (w sekundach)
    },
  }
);

// ─── Session rehydration - ładujemy z IndexedDB przy starcie ─────────────────────
// Jeśli localStorage jest pusty, ale mamy dane w IndexedDB, przywracamy sesję
let sessionRehydrated = false;
if (!sessionRehydrated && typeof window !== 'undefined') {
  (async () => {
    const localItem = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!localItem) {
      const session = await loadSessionFromIndexedDB();
      if (session?.accessToken) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          access_token: session.accessToken,
          refresh_token: session.refreshToken,
          expires_at: session.expiresAt,
          user: session.user,
        }));
        sessionRehydrated = true;
      }
    }
  })();
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// ─── Auto-refresh sesji ──────────────────────────────────────────────────────────
/**
 * Automatyczne odświeżanie sesji przy przejściu do zakładki/powrocie do aplikacji.
 * PWA na iOS/Android mogą działać w tle - to pomaga utrzymać sesję aktywną.
 */
export function setupAutoRefresh() {
  // Odśwież sesję co minutę, gdy aplikacja jest aktywna
  const refreshInterval = setInterval(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[Auth] Błąd przy automatycznym odświeżeniu sesji:', error);
        return;
      }

      // Jeśli sesja istnieje i token blisko wygaśnięcia (mniej niż 5 minut do końca)
      if (session?.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = session.expires_at - now;

        if (expiresIn < 300) { // 5 minut
          // Wymuś ponowne pobranie sesji (to odświeży token jeśli potrzebny)
          const { data: refreshed } = await supabase.auth.refreshSession(session);
          if (refreshed?.session) {
            console.log('[Auth] Sesja automatycznie odświeżona');
          }
        }
      }
    } catch (err) {
      console.warn('[Auth] Nie udało się automatycznie odświeżyć sesji:', err);
    }
  }, 60000); // Co minutę

  // Czyszczenie przy rozłączaniu
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });

  return () => clearInterval(refreshInterval);
}

// ─── Session keep-alive dla PWA ──────────────────────────────────────────────────
// Gdy PWA jest w tle, token może wygasnąć. Te funkcje pomagają utrzymać sesję aktywną.
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Uruchamia keep-alive ping co 15 minut, by utrzymać sesję aktywną.
 * Przydatne dla PWA działających w tle na iOS/Android.
 */
export function startSessionKeepAlive() {
  if (keepAliveInterval) return;

  keepAliveInterval = setInterval(async () => {
    try {
      // Delikatne odświeżenie sesji przez nieinwazyjne zapytanie
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[Supabase] Keep-alive wykrył problem z sesją:', error);
      }
    } catch (err) {
      console.warn('[Supabase] Keep-alive się nie udało:', err);
    }
  }, 15 * 60 * 1000); // Co 15 minut
}

/**
 * Zatrzymuje keep-alive ping.
 */
export function stopSessionKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Automatyczne uruchamianie keep-alive gdy PWA przechodzi w widoczność
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isSupabaseConfigured) {
      startSessionKeepAlive();
    } else if (document.hidden) {
      stopSessionKeepAlive();
    }
  });

  // Na początku uruchom keep-alive
  window.addEventListener('focus', () => {
    if (isSupabaseConfigured) {
      startSessionKeepAlive();
    }
  });
}
