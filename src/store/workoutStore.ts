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
  copyWeekDays,
  deleteWeekDays,
  migrateOldData,
  saveAllWeeksLocal,
  clearLocalData,
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

const CUSTOM_EXERCISES_KEY = 'workout-planner-custom-exercises';

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
        if (cloudCustom.length > 0) {
          saveCustomExercisesLocal(cloudCustom);
        }

        // Załaduj bieżący tydzień z chmury (lub pusty jeśli nowe konto)
        const currentKey = getWeekKey(getMondayOf(new Date()));
        setDays(loadWeekDays(currentKey));
        setCustomExercises(cloudCustom);
      } catch (err) {
        console.error('[WorkoutStore] Sync error:', err);
      } finally {
        setSyncing(false);
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
        fetchWeekPlan(userId, newKey).then(cloudDays => {
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
        fetchWeekPlan(userId, newKey).then(cloudDays => {
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

  const copyFromPrevWeek = useCallback(() => {
    const prevMonday = offsetWeek(currentMonday, -1);
    const prevKey = getWeekKey(prevMonday);
    const copied = copyWeekDays(prevKey, weekKey);
    setDays(copied);
    if (userId && isSupabaseConfigured) {
      upsertWeekPlan(userId, weekKey, copied);
    }
  }, [currentMonday, weekKey, userId]);

  // ── Helpers ──
  const persistDays = useCallback((newDays: WorkoutDay[], key: string) => {
    saveWeekDays(key, newDays);
    if (userId && isSupabaseConfigured) {
      upsertWeekPlan(userId, key, newDays);
    }
  }, [userId]);

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
    copyFromPrevWeek,
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
