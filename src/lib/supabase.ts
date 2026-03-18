import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Brak zmiennych środowiskowych VITE_SUPABASE_URL lub VITE_SUPABASE_ANON_KEY. ' +
    'Aplikacja działa w trybie offline (localStorage). ' +
    'Utwórz plik .env.local z poprawnymi kluczami aby włączyć synchronizację.'
  );
}

// ─── Klient standardowy (anon key) ───────────────────────────────────────────
// Używany do wszystkich normalnych operacji: auth, odczyt/zapis danych
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// ─── Klient administracyjny (service_role key) ───────────────────────────────
// Używany TYLKO do usuwania konta użytkownika (wymaga uprawnień admina).
// service_role omija RLS i ma pełny dostęp — używaj wyłącznie gdy konieczne.
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;
export const isAdminConfigured = !!supabaseUrl && !!supabaseServiceRoleKey;
