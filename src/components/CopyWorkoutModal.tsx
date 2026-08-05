import { useState, useEffect } from 'react';
import { Exercise, WorkoutDay } from '../types';
import {
  getMondayOf,
  getWeekKey,
  offsetWeek,
  formatWeekLabel,
  loadWeekDays,
  DAY_NAMES,
} from '../store/weekStore';
import { fetchWeekPlan } from '../lib/syncService';
import { isSupabaseConfigured } from '../lib/supabase';

interface CopyWorkoutModalProps {
  userId?: string;
  onCopy: (sourceExercises: Exercise[], targetDateStr: string) => void;
  onClose: () => void;
}

/** Zbuduj dzisiejszą datę jako lokalny `YYYY-MM-DD` (nigdy `toISOString` — to UTC). */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CopyWorkoutModal({ userId, onCopy, onClose }: CopyWorkoutModalProps) {
  // Domyślnie poprzedni tydzień — zachowuje pierwotny „szybki" przypadek użycia
  const [sourceMonday, setSourceMonday] = useState<Date>(() =>
    offsetWeek(getMondayOf(new Date()), -1)
  );
  const [sourceDays, setSourceDays] = useState<WorkoutDay[]>(() =>
    loadWeekDays(getWeekKey(sourceMonday))
  );
  const [sourceIdx, setSourceIdx] = useState<number | null>(null);
  const [targetDateStr, setTargetDateStr] = useState<string>(todayLocal());

  // ── Załaduj tydzień źródłowy: local-first, cloud-fallback (jak goToPrevWeek) ──
  useEffect(() => {
    const key = getWeekKey(sourceMonday);
    const local = loadWeekDays(key);
    setSourceDays(local);
    setSourceIdx(null); // reset wyboru przy zmianie tygodnia

    if (userId && isSupabaseConfigured) {
      let cancelled = false;
      fetchWeekPlan(userId, key).then(cloud => {
        if (cancelled) return;
        if (cloud && cloud.length > 0) {
          setSourceDays(cloud);
        }
      });
      return () => { cancelled = true; };
    }
  }, [sourceMonday, userId]);

  // Zamknij na Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Zablokuj przewijanie tła gdy modal otwarty
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ── Pochodne ──
  const sourceKey = getWeekKey(sourceMonday);
  const selectedDay = sourceIdx != null ? sourceDays.find(d => d.dayIndex === sourceIdx) : undefined;
  const sourceExercises: Exercise[] = selectedDay?.exercises ?? [];

  const targetDate = targetDateStr ? new Date(`${targetDateStr}T00:00:00`) : null;
  const targetValid = !!targetDate && !isNaN(targetDate.getTime());
  const targetMonday = targetValid ? getMondayOf(targetDate as Date) : null;
  const targetKey = targetValid && targetMonday ? getWeekKey(targetMonday) : '';
  const targetIdx = targetValid ? ((targetDate as Date).getDay() + 6) % 7 : -1;

  const isSameDay =
    targetValid &&
    sourceIdx != null &&
    sourceExercises.length > 0 &&
    targetKey === sourceKey &&
    targetIdx === sourceIdx;
  const isCrossWeek = targetValid && targetKey !== sourceKey && sourceExercises.length > 0;

  const hasAnyTraining = sourceDays.some(d => !d.isRestDay && d.exercises.length > 0);
  const canCopy = targetValid && !isSameDay && sourceExercises.length > 0;

  const handleCopy = () => {
    if (!canCopy || sourceExercises.length === 0) return;
    onCopy(sourceExercises, targetDateStr);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base sm:text-lg">Kopiuj trening</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* ── Stepper tygodnia źródłowego ── */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Tydzień źródłowy:
            </label>
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200">
              <button
                onClick={() => setSourceMonday(prev => offsetWeek(prev, -1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 active:bg-slate-300 transition-all cursor-pointer flex-shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                title="Poprzedni tydzień"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="flex-1 min-w-0 text-center">
                <span className="font-bold text-slate-800 text-sm">
                  {formatWeekLabel(sourceMonday)}
                </span>
              </div>
              <button
                onClick={() => setSourceMonday(prev => offsetWeek(prev, 1))}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 active:bg-slate-300 transition-all cursor-pointer flex-shrink-0"
                style={{ WebkitTapHighlightColor: 'transparent' }}
                title="Następny tydzień"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Lista 7 dni źródłowych ── */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Wybierz trening:
            </label>
            {!hasAnyTraining ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                Brak treningów w tym tygodniu
              </div>
            ) : (
              <div className="space-y-1.5">
                {sourceDays.map((day) => {
                  const hasWorkout = !day.isRestDay && day.exercises.length > 0;
                  const isSelected = sourceIdx === day.dayIndex;
                  return (
                    <button
                      key={day.dayIndex}
                      onClick={() => hasWorkout && setSourceIdx(day.dayIndex)}
                      disabled={!hasWorkout}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                        !hasWorkout
                          ? 'bg-slate-50 border-slate-200 opacity-50'
                          : isSelected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 active:border-violet-300 active:bg-slate-50'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          !hasWorkout
                            ? 'bg-slate-200'
                            : isSelected
                            ? 'bg-violet-500'
                            : 'bg-slate-100'
                        }`}
                      >
                        <span className="text-white font-bold text-xs sm:text-sm">
                          {day.name.substring(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p
                          className={`font-semibold text-xs sm:text-sm truncate ${
                            !hasWorkout
                              ? 'text-slate-400'
                              : isSelected
                              ? 'text-violet-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {day.name}
                        </p>
                        <p
                          className={`text-[10px] sm:text-xs ${
                            !hasWorkout
                              ? 'text-slate-300'
                              : isSelected
                              ? 'text-violet-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {day.isRestDay
                            ? 'Dzień odpoczynku'
                            : day.exercises.length > 0
                            ? `${day.exercises.length} ćwiczeń`
                            : 'Brak ćwiczeń'}
                        </p>
                      </div>
                      {isSelected && (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-5 h-5 text-violet-500 flex-shrink-0"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Picker dnia docelowego ── */}
          <div>
            <label htmlFor="copy-workout-date" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Wybierz dzień docelowy:
            </label>
            <input
              id="copy-workout-date"
              type="date"
              value={targetDateStr}
              onChange={(e) => setTargetDateStr(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />

            {targetValid && targetMonday ? (
              <div className="mt-3 bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-slate-800 font-semibold text-sm">
                  {DAY_NAMES[targetIdx]}
                  <span className="text-slate-400 font-normal"> · </span>
                  <span className="text-slate-500 font-normal text-xs">{formatWeekLabel(targetMonday)}</span>
                </p>
                {sourceExercises.length === 0 ? (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Najpierw wybierz trening z tygodnia źródłowego
                  </p>
                ) : isSameDay ? (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    To dzień źródłowy — wybierz inną datę
                  </p>
                ) : (
                  <p className={`text-[11px] mt-1 flex items-center gap-1 ${isCrossWeek ? 'text-violet-500' : 'text-slate-400'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isCrossWeek
                      ? 'Inny tydzień — kopia doklejona, stan serii zresetowany'
                      : 'Kopia zostanie doklejona do tego dnia'}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 mt-2">
                Wybierz poprawną datę
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Anuluj
          </button>
          <button
            onClick={handleCopy}
            disabled={!canCopy}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 disabled:opacity-50 active:opacity-80"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Kopiuj
          </button>
        </div>
      </div>
    </div>
  );
}
