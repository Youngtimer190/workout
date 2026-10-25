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
      storageKey: 'fitplaner-auth-token', // stały klucz — przetrwa restarty PWA na iOS
      storage: window.localStorage,       // jawnie użyj localStorage
    },
  }
);

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
