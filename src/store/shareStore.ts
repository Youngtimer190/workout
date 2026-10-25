/**
 * Store udostępnień — zwykły hook React (tak jak `useWorkoutStore`
 * i `useAuthStore`, to NIE jest Zustand).
 *
 * Jedna instancja żyje w `App.tsx`; komponenty dostają dane propami.
 * Badge w menu NIE odpytuje bazy sam — licznik przychodzi z propsów.
 */
import { useState, useCallback, useEffect } from 'react';
import { SharedWorkout } from '../types';
import {
  createShare,
  fetchShares,
  respondToShare,
  deleteShare,
  CreateShareInput,
  ShareResult,
  ShareResponse,
} from '../lib/shareService';
import { isSupabaseConfigured } from '../lib/supabase';

/** Identyfikator użytkownika demo — nie jest UUID, więc nie ma konta w bazie. */
const DEMO_USER_ID = 'demo';

export function useShareStore(userId?: string) {
  const [incoming, setIncoming] = useState<SharedWorkout[]>([]);
  const [outgoing, setOutgoing] = useState<SharedWorkout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRealUser = !!userId && userId !== DEMO_USER_ID && isSupabaseConfigured;

  const refresh = useCallback(async () => {
    if (!userId || userId === DEMO_USER_ID || !isSupabaseConfigured) {
      // Tryb demo / brak Supabase — nie ma z kim dzielić treningu.
      setIncoming([]);
      setOutgoing([]);
      setError(null);
      return;
    }
    setLoading(true);
    const result = await fetchShares(userId);
    setIncoming(result.incoming);
    setOutgoing(result.outgoing);
    setError(result.error ? result.error.message : null);
    setLoading(false);
  }, [userId]);

  // Odśwież przy zmianie użytkownika — jeden request na logowanie.
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Liczba udostępnień czekających na akceptację — do badge'a w menu. */
  const pendingCount = incoming.filter(s => s.status === 'pending').length;

  const sendShare = useCallback(async (input: CreateShareInput): Promise<ShareResult> => {
    const result = await createShare(input);
    if (!result.error) {
      // Nowy wiersz jest widoczny dla nadawcy — odśwież listę „Wysłane".
      await refresh();
    }
    return result;
  }, [refresh]);

  const respond = useCallback(async (
    shareId: string,
    status: ShareResponse,
    acceptedWeekKey?: string,
    acceptedDayIndex?: number
  ): Promise<ShareResult> => {
    const result = await respondToShare(shareId, status, acceptedWeekKey, acceptedDayIndex);
    await refresh();
    return result;
  }, [refresh]);

  const cancel = useCallback(async (shareId: string): Promise<ShareResult> => {
    const result = await deleteShare(shareId);
    await refresh();
    return result;
  }, [refresh]);

  return {
    incoming,
    outgoing,
    pendingCount,
    loading,
    error,
    /** Czy udostępnianie jest w ogóle dostępne (wymaga Supabase i konta). */
    canShare: isRealUser,
    refresh,
    sendShare,
    respond,
    cancel,
  };
}
