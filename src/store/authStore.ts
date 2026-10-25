import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Pobierz aktualną sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Nie wpuszczaj użytkownika bez potwierdzonego emaila
      if (session?.user) {
        const confirmed = session.user.email_confirmed_at || session.user.confirmed_at;
        if (!confirmed) {
          supabase.auth.signOut();
          setInitialized(true);
          return;
        }
      }
      setSession(session);
      setUser(session?.user ?? null);
      setInitialized(true);
    });

    // Nasłuchuj zmian sesji
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Wykryj tryb odzyskiwania hasła
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setSession(session);
        setUser(session?.user ?? null);
        return;
      }
      if (_event === 'USER_UPDATED') {
        setIsPasswordRecovery(false);
      }

      // Blokuj logowanie użytkownika bez potwierdzonego emaila
      if ((_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') && session?.user) {
        const confirmed = session.user.email_confirmed_at || session.user.confirmed_at;
        const hasIdentities = session.user.identities && session.user.identities.length > 0;
        if (!confirmed && !hasIdentities) {
          // Wyloguj asynchronicznie żeby nie blokować listenera
          setTimeout(() => supabase.auth.signOut(), 0);
          return;
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: AuthError | null; needsConfirmation: boolean }> => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    const needsConfirmation = !error && !!data.user && (
      !data.session ||
      (data.user.identities !== undefined && data.user.identities.length === 0)
    );
    return { error, needsConfirmation };
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
    localStorage.removeItem('fitplaner-auth-token');
    localStorage.removeItem('workout-planner-weeks');
    localStorage.removeItem('workout-planner-custom-exercises');
    setLoading(false);
  }, []);

  /**
   * Usuwa konto użytkownika wraz ze wszystkimi danymi.
   *
   * Wykonuje to wyłącznie funkcja SQL `delete_user_account()` (SECURITY DEFINER),
   * która kasuje dane z tabel aplikacji ORAZ wiersz z auth.users.
   * Klucz service_role nie jest używany w frontendzie — build wbudowuje
   * wszystkie zmienne VITE_* do publicznego bundle, więc klucz admina
   * byłby widoczny dla każdego odwiedzającego.
   * Wymaga wgranej funkcji — patrz SUPABASE_SETUP.md.
   */
  const deleteAccount = useCallback(async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Brak zalogowanego użytkownika' };

    setLoading(true);

    try {
      // ── Krok 1: Usuń konto i wszystkie dane (funkcja SQL SECURITY DEFINER) ───
      const { error: rpcError } = await supabase.rpc('delete_user_account');

      if (rpcError) {
        console.error('[deleteAccount] RPC error:', rpcError);
        throw new Error(
          'Nie udało się usunąć konta. Upewnij się, że funkcja delete_user_account() ' +
          'jest wgrana do bazy (SUPABASE_SETUP.md → SQL Editor).'
        );
      }

      // ── Krok 2: Wyczyść sesję lokalnie bez wywoływania signOut() ─────────────
      // NIE wywołujemy supabase.auth.signOut() — konto już nie istnieje w bazie
      // i Supabase zwróciłby 403. Czyścimy stan lokalnie.
      setUser(null);
      setSession(null);

      // ── Krok 3: Wyczyść localStorage ─────────────────────────────────────────
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
      redirectTo: 'https://workout-flax-five.vercel.app',
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (
    newPassword: string
  ): Promise<{ error: AuthError | null }> => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (!error) setIsPasswordRecovery(false);
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
    isPasswordRecovery,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    deleteAccount,
    resetPassword,
    updatePassword,
    loginAsDemo,
    exitDemoMode,
  };
}
