import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';

export type AuthView = 'login' | 'register';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

const DEMO_USER = {
  id: 'demo',
  email: 'demo@fitplaner.app',
  user_metadata: { full_name: 'Użytkownik Demo' },
} as unknown as User;

export function useAuthStore() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(!isSupabaseConfigured);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Pobierz aktualną sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setInitialized(true);
    });

    // Nasłuchuj zmian sesji
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    return { error };
  }, []);

  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // Wyczyść localStorage — dane lokalne nie powinny być widoczne
    // po wylogowaniu ani dla kolejnego użytkownika
    localStorage.removeItem('workout-planner-weeks');
    localStorage.removeItem('workout-planner-custom-exercises');
    setLoading(false);
  }, []);

  /**
   * Usuwa konto użytkownika wraz ze wszystkimi danymi.
   *
   * Strategia (w kolejności próbowania):
   * 1. supabaseAdmin.auth.admin.deleteUser() — jeśli skonfigurowany service_role key
   *    → Gwarantowane usunięcie z auth.users (kaskadowo usuwa też dane przez FK)
   * 2. supabase.rpc('delete_user_account') — fallback przez funkcję SQL SECURITY DEFINER
   *    → Wymaga że funkcja jest wgrana do bazy (patrz SUPABASE_SETUP.md)
   */
  const deleteAccount = useCallback(async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Brak zalogowanego użytkownika' };

    setLoading(true);

    try {
      const userId = user.id;

      // ── Krok 1: Usuń dane użytkownika z tabel (dla pewności, mimo ON DELETE CASCADE) ──
      await supabase.from('week_plans').delete().eq('user_id', userId);
      await supabase.from('custom_exercises').delete().eq('user_id', userId);

      // ── Krok 2: Usuń konto z auth.users ──────────────────────────────────────
      if (supabaseAdmin) {
        // Metoda preferowana: admin API z service_role key
        const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (adminError) {
          console.error('[deleteAccount] Admin deleteUser error:', adminError);
          throw new Error(adminError.message);
        }
      } else {
        // Fallback: RPC funkcja SQL (SECURITY DEFINER)
        // Wymaga wgranej funkcji delete_user_account() — patrz SUPABASE_SETUP.md
        const { error: rpcError } = await supabase.rpc('delete_user_account');

        if (rpcError) {
          console.error('[deleteAccount] RPC error:', rpcError);
          throw new Error(
            'Nie udało się usunąć konta. Upewnij się że klucz VITE_SUPABASE_SERVICE_ROLE_KEY ' +
            'jest ustawiony w .env.local lub funkcja delete_user_account() jest wgrana do bazy.'
          );
        }
      }

      // ── Krok 3: Wyloguj lokalnie ──────────────────────────────────────────────
      await supabase.auth.signOut();

      // ── Krok 4: Wyczyść localStorage ─────────────────────────────────────────
      const keysToRemove = Object.keys(localStorage).filter(k =>
        k.startsWith('fitplaner_') || k.startsWith('sb-')
      );
      keysToRemove.forEach(k => localStorage.removeItem(k));

      setLoading(false);
      return { error: null };

    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error
        ? err.message
        : 'Wystąpił nieznany błąd podczas usuwania konta';
      return { error: message };
    }
  }, [user]);

  const resetPassword = useCallback(async (
    email: string
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }, []);

  const loginAsDemo = useCallback(() => {
    setUser(DEMO_USER);
    setIsDemoMode(true);
    setInitialized(true);
  }, []);

  const exitDemoMode = useCallback(() => {
    setUser(null);
    setIsDemoMode(false);
    // Wyczyść dane demo z localStorage
    const keys = Object.keys(localStorage).filter(k => k.includes('_demo_') || k.includes('demo'));
    keys.forEach(k => localStorage.removeItem(k));
  }, []);

  return {
    user,
    session,
    loading,
    initialized,
    isDemoMode,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    resetPassword,
    loginAsDemo,
    exitDemoMode,
  };
}
