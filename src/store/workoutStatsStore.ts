/**
 * Statystyki treningowe na pulpicie.
 *
 * Źródło danych: WSZYSTKIE zapisane tygodnie — z localStorage (szybko,
 * offline) i z chmury (pełna historia, jedno zapytanie). Chmura ma
 * pierwszeństwo, bo zawiera tygodnie, których użytkownik na tym urządzeniu
 * jeszcze nie otwierał.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WorkoutDay } from '../types';
import { loadAllWeeksLocal } from '../store/weekStore';
import { fetchAllWeekPlans } from '../lib/syncService';
import { computeWorkoutStats, WeeksMap, WorkoutStats } from '../lib/stats';
import { isSupabaseConfigured } from '../lib/supabase';

/** Liczba zaliczonych serii w tygodniu. */
function completedSetsCount(days: WorkoutDay[]): number {
  return (days ?? []).reduce(
    (acc, d) => acc + (d.exercises ?? []).reduce((a, e) => a + (e.setLogs ?? []).filter(l => l.done).length, 0),
    0
  );
}

/**
 * Scalenie tygodni: lokalna kopia i chmura.
 *
 * Zwykle wygrywa chmura (jest źródłem prawdy między urządzeniami), ale
 * są dwa przypadki, w których to chmura jest NIEŚWIEŻA:
 *  • zapis do chmury jeszcze nie dotarł (jest opóźniony o ruch sieci),
 *  • użytkownik edytował tydzień offline i zapis nie przeszedł.
 *
 * Wtedy lokalna wersja ma serię zaliczoną, której chmura nie zna — i to
 * jednoznacznie wskazuje, że to ona jest nowsza. Dlatego wygrywa wtedy
 * lokalna kopia.
 */
function mergeWeeks(local: WeeksMap, cloud: WeeksMap): WeeksMap {
  const merged: WeeksMap = { ...local };

  for (const [key, cloudDays] of Object.entries(cloud)) {
    const localDays = local[key];
    if (!localDays) {
      merged[key] = cloudDays;
      continue;
    }
    const localIsNewer = completedSetsCount(localDays) > completedSetsCount(cloudDays);
    merged[key] = localIsNewer ? localDays : cloudDays;
  }

  return merged;
}

const EMPTY_STATS: WorkoutStats = {
  monthWorkouts: 0,
  streakWeeks: 0,
  weekVolume: 0,
  totalVolume: 0,
  weekCardioMinutes: 0,
  totalCardioMinutes: 0,
  monthLabel: '',
};

/**
 * Identyfikator trybu demo — w demo nie ma prawdziwego konta w chmurze,
 * a zapytanie z id „demo" kończy się błędem formatu uuid (wygląda to
 * jak awaria chmury, choć nią nie jest).
 */
const DEMO_USER_ID = 'demo';

export function useWorkoutStats(
  userId?: string,
  /** Bieżący tydzień (klucz + dni) — wersja z ekranu, najświeższa. */
  currentWeek?: { key: string; days: WorkoutDay[] } | null,
  /**
   * Czy widok ze statystykami jest otwarty.
   *
   * Pełna historia tygodni to jedno zapytanie do bazy — na małej puli
   * połączeń (free tier) nie warto ciągnąć jej przy każdym starcie
   * aplikacji. Pobieramy ją dopiero, gdy pulpit jest faktycznie widoczny.
   */
  active = true
) {
  const [weeks, setWeeks] = useState<WeeksMap>(() => loadAllWeeksLocal());
  const [loading, setLoading] = useState(false);

  /**
   * Bieżący tydzień trzymamy w REF, a nie w zależności efektu.
   *
   * Obiekt przekazywany z zewnątrz jest tworzony przy każdym renderze, więc
   * zależność od jego tożsamości powodowała pętlę: nowy obiekt → nowy
   * useCallback → nowy useEffect → setWeeks → render → nowy obiekt…
   * („Maximum update depth exceeded”).
   */
  const currentWeekRef = useRef(currentWeek);
  useEffect(() => {
    currentWeekRef.current = currentWeek;
  });

  /** Przelicza statystyki z aktualnego zestawu tygodni. */
  const stats = useMemo<WorkoutStats>(
    () => computeWorkoutStats(weeks),
    [weeks]
  );

  /** Ponowne przeliczenie (np. po zapisaniu tygodnia). */
  const refreshLocal = useCallback(() => {
    const local = loadAllWeeksLocal();
    const cw = currentWeekRef.current;
    setWeeks(cw ? { ...local, [cw.key]: cw.days } : local);
  }, []);

  // Pełna historia z chmury — tylko gdy statystyki są oglądane.
  useEffect(() => {
    if (!userId || userId === DEMO_USER_ID || !isSupabaseConfigured) {
      refreshLocal();
      return;
    }
    if (!active) return;

    let cancelled = false;
    setLoading(true);

    fetchAllWeekPlans(userId)
      .then(cloud => {
        if (cancelled) return;
        setWeeks(prev => {
          const merged = mergeWeeks(prev, cloud);
          // Bieżący tydzień bierzemy z ekranu — jest świeższy niż kopia
          // w chmurze (zapis dopiero leci do sieci).
          const cw = currentWeekRef.current;
          return cw ? { ...merged, [cw.key]: cw.days } : merged;
        });
      })
      .catch(() => {
        // Cicha porażka — zostają dane lokalne.
        if (!cancelled) refreshLocal();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, refreshLocal, active]);

  return { stats: stats ?? EMPTY_STATS, loading, refresh: refreshLocal };
}
