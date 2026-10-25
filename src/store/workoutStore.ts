import { useState, useCallback, useEffect } from 'react';
import { WorkoutDay, Exercise } from '../types';
import {
  loadWeekDays,
  saveWeekDays,
  createDefaultDays,
  getMondayOf,
  getWeekKey,
  buildWeekMeta,
  offsetWeek,
  WeekMeta,
  deleteWeekDays,
  migrateOldData,
  saveAllWeeksLocal,
  clearLocalData,
  CUSTOM_EXERCISES_KEY,
} from './weekStore';
import {
  upsertWeekPlan,
  fetchWeekPlan,
  upsertCustomExercise,
  deleteCustomExerciseRemote,
  fetchCustomExercises,
  syncAllDataFromCloud,
} from '../lib/syncService';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * Łączy tydzień z chmury z tygodniem z localStorage.
 *
 * Chmura jest bazą (źródło prawdy), a ćwiczenia znane tylko lokalnie
 * są doklejane. Bez tego zapis do innego tygodnia nadpisywałby chmurę
 * defaultami z localStorage i cicho kasował trening zapisany na innym
 * urządzeniu.
 */
function mergeWeekDays(cloud: WorkoutDay[], local: WorkoutDay[]): WorkoutDay[] {
  return cloud.map(day => {
    const localDay = local.find(d => d.dayIndex === day.dayIndex);
    if (!localDay) return day;
    const cloudIds = new Set(day.exercises.map(e => e.id));
    const extra = localDay.exercises.filter(e => !cloudIds.has(e.id));
    return extra.length > 0
      ? { ...day, exercises: [...day.exercises, ...extra] }
      : day;
  });
}

function loadCustomExercisesLocal(): Exercise[] {
  try {
    const raw = localStorage.getItem(CUSTOM_EXERCISES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCustomExercisesLocal(exercises: Exercise[]) {
  localStorage.setItem(CUSTOM_EXERCISES_KEY, JSON.stringify(exercises));
}

// Run migration once
migrateOldData();

export function useWorkoutStore(userId?: string) {
  // ── Week navigation state ──
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOf(new Date()));
  const weekKey = getWeekKey(currentMonday);
  const weekMeta: WeekMeta = buildWeekMeta(currentMonday);

  // ── Days for current week ──
  const [days, setDays] = useState<WorkoutDay[]>(() =>
    loadWeekDays(getWeekKey(getMondayOf(new Date())))
  );

  // ── Custom exercises ──
  const [customExercises, setCustomExercises] = useState<Exercise[]>(loadCustomExercisesLocal);

  // ── Sync state ──
  const [syncing, setSyncing] = useState(false);
  const [isHydrating, setIsHydrating] = useState(() => !!isSupabaseConfigured);

  // ── On userId change: sync data from cloud ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    if (!userId) {
      // Użytkownik wylogował się — wyczyść localStorage żeby kolejny
      // użytkownik nie widział danych poprzedniego
      clearLocalData();
      const currentKey = getWeekKey(getMondayOf(new Date()));
      setDays(createDefaultDays(currentKey));
      setCustomExercises([]);
      return;
    }

    const syncFromCloud = async () => {
      setSyncing(true);
      try {
        // Zawsze pobierz dane z chmury dla zalogowanego użytkownika.
        // NIE pushujemy lokalnych danych — lokalne dane to dane anonimowe
        // które nie należą do żadnego konta.
        const { weeks: cloudWeeks, customExercises: cloudCustom } = await syncAllDataFromCloud(userId);

        // Wyczyść lokalne dane i zastąp danymi z chmury
        clearLocalData();

        if (Object.keys(cloudWeeks).length > 0) {
          saveAllWeeksLocal(cloudWeeks);
        }
        // Zapisujemy BEZWZGLĘDNIE — także pustą listę. Pod warunkiem
        // „cloudCustom.length > 0" użytkownik bez własnych ćwiczeń zostawałby
        // z ćwiczeniami poprzedniego użytkownika tego samego urządzenia.
        saveCustomExercisesLocal(cloudCustom);

        // Załaduj bieżący tydzień z chmury (lub pusty jeśli nowe konto)
        const currentKey = getWeekKey(getMondayOf(new Date()));
        setDays(loadWeekDays(currentKey));
        setCustomExercises(cloudCustom);
      } catch (err) {
        console.error('[WorkoutStore] Sync error:', err);
      } finally {
        setSyncing(false);
        setIsHydrating(false);
      }
    };

    syncFromCloud();
  }, [userId]);

  // ── Week navigation ──
  const goToPrevWeek = useCallback(async () => {
    setCurrentMonday(prev => {
      const newMonday = offsetWeek(prev, -1);
      const newKey = getWeekKey(newMonday);
      const loadedDays = loadWeekDays(newKey);
      setDays(loadedDays);

      // Fetch from cloud in background
      if (userId && isSupabaseConfigured) {
        fetchWeekPlan(userId, newKey).then(({ days: cloudDays }) => {
          if (cloudDays) {
            saveWeekDays(newKey, cloudDays);
            setDays(cloudDays);
          }
        });
      }

      return newMonday;
    });
  }, [userId]);

  const goToNextWeek = useCallback(async () => {
    setCurrentMonday(prev => {
      const newMonday = offsetWeek(prev, 1);
      const newKey = getWeekKey(newMonday);
      const loadedDays = loadWeekDays(newKey);
      setDays(loadedDays);

      if (userId && isSupabaseConfigured) {
        fetchWeekPlan(userId, newKey).then(({ days: cloudDays }) => {
          if (cloudDays) {
            saveWeekDays(newKey, cloudDays);
            setDays(cloudDays);
          }
        });
      }

      return newMonday;
    });
  }, [userId]);

  const goToCurrentWeek = useCallback(() => {
    const monday = getMondayOf(new Date());
    const key = getWeekKey(monday);
    setCurrentMonday(monday);
    setDays(loadWeekDays(key));
  }, []);

  /**
   * Przechodzi do tygodnia zawierającego podaną datę.
   *
   * Wyprowadzamy poniedziałek z KONKRETNEJ daty (`getMondayOf`) i liczymy
   * klucz tą samą funkcją, której używa reszta aplikacji (`getWeekKey`).
   *
   * NIE używamy `goToWeekByKey` — tamten algorytm jest zgodny z ISO-8601,
   * a `getWeekKey` używa własnego (nie-ISO) formatu `YYYY-Www`, więc
   * round-trip by się rozjechał (np. `getWeekKey(30.12.2024)` = "2024-W53",
   * ISO = "2025-W01").
   */
  const goToWeekContaining = useCallback((date: Date) => {
    const monday = getMondayOf(date);
    const key = getWeekKey(monday);
    setCurrentMonday(monday);
    setDays(loadWeekDays(key));

    if (userId && isSupabaseConfigured) {
      fetchWeekPlan(userId, key).then(({ days: cloudDays }) => {
        if (cloudDays) {
          saveWeekDays(key, cloudDays);
          setDays(cloudDays);
        }
      });
    }
  }, [userId]);

  const goToWeekByKey = useCallback((key: string) => {
    const [yearStr, weekStr] = key.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
    monday.setHours(0, 0, 0, 0);
    setCurrentMonday(monday);
    setDays(loadWeekDays(key));
  }, []);

  // ── Helpers ──
  const persistDays = useCallback((newDays: WorkoutDay[], key: string) => {
    saveWeekDays(key, newDays);
    if (userId && isSupabaseConfigured) {
      upsertWeekPlan(userId, key, newDays).then(err => {
        if (err) console.error('[WorkoutStore] persistDays — zapis w chmurze nieudany:', err);
      });
    }
  }, [userId]);

  /**
   * Skopiuj trening (listę ćwiczeń) z dowolnego tygodnia do dnia docelowego.
   *
   * Źródło pozostaje nienaruszone; stan serii (done ✓) resetowany na false
   * (waga/powtórzenia zachowane jako referencja) — świeży szablon jak przy copy.
   * Dzień docelowy może być w innym tygodniu niż bieżący (append, nie replace).
   *
   * Przed zapisem tygodnia docelowego pobieramy jego stan Z CHMURY. Wcześniejsza
   * wersja bazowała wyłącznie na localStorage, przez co przy zapisie z drugiego
   * urządzenia nadpisywała chmurę defaultami — ciche utracenie danych.
   *
   * Zwraca błąd zapisu (albo `null`), żeby przepływ akceptacji udostępnienia
   * mógł odrzucić akceptację, gdy trening nie trafił do planu.
   */
  const copyWorkoutToDay = useCallback(async (
    sourceExercises: Exercise[],
    targetDateStr: string
  ): Promise<{ error: Error | null; weekKey: string; dayIndex: number }> => {
    if (!targetDateStr || sourceExercises.length === 0) {
      return { error: null, weekKey: '', dayIndex: -1 };
    }
    // Parsuj w czasie lokalnym, żeby uniknąć przesunięcia dnia przez offset UTC
    const targetDate = new Date(`${targetDateStr}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      return { error: new Error('Nieprawidłowa data docelowa'), weekKey: '', dayIndex: -1 };
    }

    const targetMonday = getMondayOf(targetDate);
    const targetKey = getWeekKey(targetMonday);
    const targetIdx = (targetDate.getDay() + 6) % 7; // Mon=0..Sun=6 (jak createDefaultDays)

    // ── Baza: chmura (źródło prawdy) scalona z localStorage ──
    let targetDays = loadWeekDays(targetKey);
    if (userId && isSupabaseConfigured) {
      const { days: cloudDays, error: fetchError } = await fetchWeekPlan(userId, targetKey);
      if (fetchError) {
        // Nie znamy aktualnego stanu chmury — zapis mógłby nadpisać cudze dane.
        console.error('[WorkoutStore] copyWorkoutToDay — nie pobrano tygodnia z chmury:', fetchError);
        return { error: fetchError, weekKey: targetKey, dayIndex: targetIdx };
      }
      if (cloudDays && cloudDays.length > 0) {
        targetDays = mergeWeekDays(cloudDays, targetDays);
      }
    }

    // Świeża kopia: re-id + reset done=false (zachowaj wagę/powt.)
    const fresh = sourceExercises.map(ex => {
      const freshSetLogs = Array.isArray(ex.setLogs)
        ? ex.setLogs.map(log => ({
            id: log.id,
            setNumber: log.setNumber,
            targetReps: log.targetReps,
            actualReps: log.actualReps,
            weight: log.weight,
            done: false,
            note: log.note,
          }))
        : [];
      return {
        ...ex,
        id: `${targetKey}-${ex.id.split('-')[0]}-${Date.now()}-${Math.random()}`,
        setLogs: freshSetLogs,
      };
    });

    const nextTarget = targetDays.map(d =>
      d.dayIndex === targetIdx
        ? { ...d, exercises: [...d.exercises, ...fresh], isRestDay: false }
        : d
    );

    // ── Zapis: najpierw chmura (żeby błąd nie zostawił fałszywego „zapisano"),
    //    potem localStorage ──
    let error: Error | null = null;
    if (userId && isSupabaseConfigured) {
      error = await upsertWeekPlan(userId, targetKey, nextTarget);
    }
    saveWeekDays(targetKey, nextTarget);

    // Bieżący tydzień — zaktualizuj stan widoczny w UI
    if (targetKey === weekKey) {
      setDays(nextTarget);
    }

    return { error, weekKey: targetKey, dayIndex: targetIdx };
  }, [userId, weekKey]);

  const updateDaysForCurrentWeek = useCallback((newDays: WorkoutDay[]) => {
    setDays(newDays);
    persistDays(newDays, weekKey);
  }, [weekKey, persistDays]);

  // ── Day mutations ──
  const toggleRestDay = useCallback((dayId: string) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId ? { ...d, isRestDay: !d.isRestDay, exercises: d.isRestDay ? d.exercises : [] } : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const addExercise = useCallback((dayId: string, exercise: Exercise) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId
          ? { ...d, exercises: [...d.exercises, { ...exercise, id: `${exercise.id}-${Date.now()}` }] }
          : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const removeExercise = useCallback((dayId: string, exerciseId: string) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) } : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const updateExercise = useCallback((dayId: string, exerciseId: string, updates: Partial<Exercise>) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map(e => (e.id === exerciseId ? { ...e, ...updates } : e)) }
          : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const updateSetLogs = useCallback((dayId: string, exerciseId: string, setLogs: Exercise['setLogs']) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId
          ? { ...d, exercises: d.exercises.map(e => e.id === exerciseId ? { ...e, setLogs } : e) }
          : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const replaceExercise = useCallback((dayId: string, exerciseId: string, newExercise: Exercise) => {
    setDays(prev => {
      const next = prev.map(d =>
        d.id === dayId
          ? {
              ...d,
              exercises: d.exercises.map(e =>
                e.id === exerciseId ? { ...newExercise, id: exerciseId } : e
              ),
            }
          : d
      );
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const reorderExercises = useCallback((dayId: string, exercises: Exercise[]) => {
    setDays(prev => {
      const next = prev.map(d => (d.id === dayId ? { ...d, exercises } : d));
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const moveExercise = useCallback((dayId: string, exerciseId: string, direction: 'up' | 'down') => {
    setDays(prev => {
      const next = prev.map(d => {
        if (d.id !== dayId) return d;
        const exs = [...d.exercises];
        const idx = exs.findIndex(e => e.id === exerciseId);
        if (idx === -1) return d;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= exs.length) return d;
        [exs[idx], exs[targetIdx]] = [exs[targetIdx], exs[idx]];
        return { ...d, exercises: exs };
      });
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  const moveExerciseToDay = useCallback((sourceDayId: string, exerciseId: string, targetDayId: string) => {
    setDays(prev => {
      const sourceDay = prev.find(d => d.id === sourceDayId);
      if (!sourceDay) return prev;
      const exercise = sourceDay.exercises.find(e => e.id === exerciseId);
      if (!exercise) return prev;
      const next = prev.map(d => {
        if (d.id === sourceDayId) {
          return { ...d, exercises: d.exercises.filter(e => e.id !== exerciseId) };
        }
        if (d.id === targetDayId) {
          return { ...d, exercises: [...d.exercises, exercise] };
        }
        return d;
      });
      persistDays(next, weekKey);
      return next;
    });
  }, [weekKey, persistDays]);

  // Przenieś cały trening (wszystkie ćwiczenia z dnia) na dowolną datę — również
  // do innego tygodnia. Data docelowa pochodzi z <input type="date"> (YYYY-MM-DD).
  // Stan serii (setLogs: ✓ done + ciężary) jest zachowywany — to cut&paste, nie reset.
  //
  // UWAGA: zapis do innego tygodnia NIE jest skutkiem updatera `setDays` —
  // updater musi być czysty, a React w trybie StrictMode wywołuje go
  // dwukrotnie (podwójne doklejenie ćwiczeń).
  const moveAllExercisesToDate = useCallback(async (
    sourceDayId: string,
    targetDateStr: string
  ): Promise<{ error: Error | null }> => {
    if (!targetDateStr) return { error: null };
    // Parsuj w czasie lokalnym, żeby uniknąć przesunięcia dnia przez offset UTC
    const targetDate = new Date(`${targetDateStr}T00:00:00`);
    if (isNaN(targetDate.getTime())) {
      return { error: new Error('Nieprawidłowa data docelowa') };
    }

    const targetMonday = getMondayOf(targetDate);
    const targetKey = getWeekKey(targetMonday);
    const targetIdx = (targetDate.getDay() + 6) % 7; // Mon=0..Sun=6 (jak createDefaultDays)

    const sourceDay = days.find(d => d.id === sourceDayId);
    if (!sourceDay || sourceDay.exercises.length === 0) return { error: null };
    // Guard: data == dzień źródłowy → no-op
    if (targetKey === weekKey && targetIdx === sourceDay.dayIndex) return { error: null };

    if (targetKey === weekKey) {
      // TEN SAM TYDZIEŃ — mutuj bieżący stan (jak dotychczas)
      setDays(prev => {
        const next = prev.map(d => {
          if (d.id === sourceDayId) return { ...d, exercises: [] };
          if (d.dayIndex === targetIdx) {
            return { ...d, exercises: [...d.exercises, ...sourceDay.exercises], isRestDay: false };
          }
          return d;
        });
        persistDays(next, weekKey);
        return next;
      });
      return { error: null };
    }

    // INNY TYDZIEŃ — cut&paste, setLogs zachowane (brak re-id)
    // (a) Tydzień docelowy: doklej ćwiczenia do dnia (lokalnie + chmura, po jawnym key)
    //     Baza = chmura (źródło prawdy) scalona z localStorage — inaczej zapis
    //     z drugiego urządzenia nadpisałby chmurę defaultami.
    let targetDays = loadWeekDays(targetKey);
    if (userId && isSupabaseConfigured) {
      const { days: cloudDays, error: fetchError } = await fetchWeekPlan(userId, targetKey);
      if (fetchError) {
        console.error('[WorkoutStore] moveAllExercisesToDate — nie pobrano tygodnia z chmury:', fetchError);
        return { error: fetchError };
      }
      if (cloudDays && cloudDays.length > 0) {
        targetDays = mergeWeekDays(cloudDays, targetDays);
      }
    }

    const nextTarget = targetDays.map(d =>
      d.dayIndex === targetIdx
        ? { ...d, exercises: [...d.exercises, ...sourceDay.exercises], isRestDay: false }
        : d
    );

    let error: Error | null = null;
    if (userId && isSupabaseConfigured) {
      error = await upsertWeekPlan(userId, targetKey, nextTarget);
    }
    saveWeekDays(targetKey, nextTarget);

    // (b) Bieżący tydzień: opróżnij dzień źródłowy
    setDays(prev => {
      const nextSource = prev.map(d =>
        d.id === sourceDayId ? { ...d, exercises: [] } : d
      );
      persistDays(nextSource, weekKey);
      return nextSource; // `days` zawsze odzwierciedla bieżący tydzień
    });

    return { error };
  }, [days, weekKey, persistDays, userId]);

  const resetWeek = useCallback(() => {
    const fresh = createDefaultDays(weekKey);
    setDays(fresh);
    persistDays(fresh, weekKey);
  }, [weekKey, persistDays]);

  const clearWeek = useCallback(() => {
    deleteWeekDays(weekKey);
    setDays(createDefaultDays(weekKey));
  }, [weekKey]);

  const loadGeneratedPlan = useCallback((generatedDays: WorkoutDay[]) => {
    const rekeyed = generatedDays.map((d, i) => ({
      ...d,
      id: `${weekKey}-day-${i}`,
      exercises: d.exercises.map(e => ({
        ...e,
        id: `${e.id}-${weekKey}-${i}`,
      })),
    }));
    setDays(rekeyed);
    persistDays(rekeyed, weekKey);
  }, [weekKey, persistDays]);

  // ── Custom exercises ──
  const addCustomExercise = useCallback((exercise: Exercise) => {
    setCustomExercises(prev => {
      const next = [...prev, exercise];
      saveCustomExercisesLocal(next);
      if (userId && isSupabaseConfigured) {
        upsertCustomExercise(userId, exercise);
      }
      return next;
    });
  }, [userId]);

  const updateCustomExercise = useCallback((updated: Exercise) => {
    setCustomExercises(prev => {
      const next = prev.map(e => e.id === updated.id ? updated : e);
      saveCustomExercisesLocal(next);
      if (userId && isSupabaseConfigured) {
        upsertCustomExercise(userId, updated);
      }
      return next;
    });
  }, [userId]);

  const deleteCustomExercise = useCallback((id: string) => {
    setCustomExercises(prev => {
      const next = prev.filter(e => e.id !== id);
      saveCustomExercisesLocal(next);
      if (userId && isSupabaseConfigured) {
        deleteCustomExerciseRemote(userId, id);
      }
      return next;
    });
  }, [userId]);

  // Reload custom exercises from cloud
  const refreshCustomExercises = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    const cloudExercises = await fetchCustomExercises(userId);
    if (cloudExercises.length > 0) {
      setCustomExercises(cloudExercises);
      saveCustomExercisesLocal(cloudExercises);
    }
  }, [userId]);

  return {
    // Week navigation
    currentMonday,
    weekKey,
    weekMeta,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeekByKey,
    goToWeekContaining,
    isHydrating,
    copyWorkoutToDay,
    // Days
    days,
    toggleRestDay,
    addExercise,
    removeExercise,
    updateExercise,
    updateSetLogs,
    replaceExercise,
    reorderExercises,
    moveExercise,
    moveExerciseToDay,
    moveAllExercisesToDate,
    resetWeek,
    clearWeek,
    loadGeneratedPlan,
    updateDaysForCurrentWeek,
    // Custom exercises
    customExercises,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    refreshCustomExercises,
    // Sync state
    syncing,
  };
}