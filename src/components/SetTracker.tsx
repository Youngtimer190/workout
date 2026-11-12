import { useState, useEffect, useRef, Fragment } from 'react';
import { SetLog, Exercise } from '../types';
import { CheckIcon, TimerIcon } from './icons';
import { buildCardioLog, CARDIO_DEFAULT_MINUTES } from '../lib/cardio';
import Stepper, { StepperMode } from './Stepper';
import { useIsNarrow } from '../hooks/useMediaQuery';

interface SetTrackerProps {
  exercise?: Exercise;
  sets: number;
  defaultReps: string;
  defaultWeight: number | null;
  setLogs: SetLog[];
  isCardio?: boolean;
  duration?: number;
  onChange: (logs: SetLog[]) => void;
}

function buildLogs(existing: SetLog[], count: number, defaultReps: string, defaultWeight: number | null): SetLog[] {
  const result: SetLog[] = [];
  for (let i = 0; i < count; i++) {
    if (existing[i]) {
      result.push({ ...existing[i], setNumber: i + 1 });
    } else {
      result.push({
        id: `set-${i + 1}-${Date.now()}-${Math.random()}`,
        setNumber: i + 1,
        targetReps: defaultReps || '8-12',
        actualReps: null,
        weight: defaultWeight,
        done: false,
      });
    }
  }
  return result;
}

export default function SetTracker({
  exercise,
  sets,
  defaultReps,
  defaultWeight,
  setLogs,
  isCardio = false,
  duration,
  onChange,
}: SetTrackerProps) {
  // Local copy of logs — never re-synced from props while editing
  // If setLogs has items, use its length (preserves manual add/delete).
  // If empty, fall back to planned `sets` (handles generator exercises without setLogs).
  const initialSetsCount = setLogs.length > 0 ? setLogs.length : sets;
  const [localLogs, setLocalLogs] = useState<SetLog[]>(() =>
    buildLogs(setLogs, initialSetsCount, defaultReps, defaultWeight)
  );

  // Track previous sets count to detect structural changes only
  const prevSetsRef = useRef(sets);
  const isEditingRef = useRef(false);

  // Only rebuild when NUMBER of sets changes (structural change), not on every prop update
  useEffect(() => {
    if (prevSetsRef.current !== sets) {
      prevSetsRef.current = sets;
      setLocalLogs(prev => buildLogs(prev, sets, defaultReps, defaultWeight));
    }
  }, [sets, defaultReps, defaultWeight]);

  // Detect external reset (e.g. copy from previous week resets done=false)
  // If ALL incoming setLogs have done=false but locally we have some done=true → external reset
  const prevLogsRef = useRef(setLogs);
  useEffect(() => {
    const prev = prevLogsRef.current;
    prevLogsRef.current = setLogs;

    if (!Array.isArray(setLogs) || setLogs.length === 0) return;
    if (isEditingRef.current) return;

    const incomingAllUndone = setLogs.every(l => l.done === false);
    const localHasDone = localLogs.some(l => l.done === true);

    // External reset detected — rebuild from incoming setLogs
    if (incomingAllUndone && localHasDone) {
      setLocalLogs(buildLogs(setLogs, sets, defaultReps, defaultWeight));
    }

    // Suppress unused var warning
    void prev;
  }, [setLogs]);

  // Sync with external changes to setLogs (e.g. added via store from another component, or after remount)
  // If incoming setLogs has more items than localLogs, merge the new ones
  const prevLogsLengthRef = useRef(setLogs.length);
  useEffect(() => {
    if (isEditingRef.current) return;

    const prevLength = prevLogsLengthRef.current;
    const currentLength = setLogs.length;
    prevLogsLengthRef.current = currentLength;

    if (currentLength > prevLength) {
      // New sets were added externally - merge them
      setLocalLogs(prev => {
        // Find new logs in setLogs that don't exist in localLogs (by id)
        const existingIds = new Set(prev.map(l => l.id));
        const newLogs = setLogs.filter(l => !existingIds.has(l.id));

        if (newLogs.length > 0) {
          // Ensure setNumbers are correct
          const merged = [...prev, ...newLogs].map((log, idx) => ({
            ...log,
            setNumber: idx + 1,
          }));
          return merged;
        }
        return prev;
      });
    }
  }, [setLogs]);

  // Editing cell state
  const [editingCell, setEditingCell] = useState<{ setIdx: number; field: 'reps' | 'weight' } | null>(null);

  const updateLog = (idx: number, updates: Partial<SetLog>) => {
    setLocalLogs(prev => {
      const next = prev.map((s, i) => (i === idx ? { ...s, ...updates } : s));
      // Push to parent after state update
      setTimeout(() => onChange(next), 0);
      return next;
    });
  };

  /** Wchodzi w tryb edycji komórki (pola to pilnuje sam Stepper). */
  const startEdit = (setIdx: number, field: 'reps' | 'weight') => {
    isEditingRef.current = true;
    setEditingCell({ setIdx, field });
  };

  /** Wyjście z trybu edycji — wartość zapisuje sam Stepper. */
  const cancelEdit = () => {
    setEditingCell(null);
    isEditingRef.current = false;
  };

  const isDumbbell = !!exercise?.requiredEquipment?.includes('dumbbells');
  const isUnilateral = !!exercise?.isUnilateral;

  // Telefon: komórka ma tylko ~56 px, więc przyciski ± pojawiają się
  // dopiero po dotknięciu wartości. Przy okazji chowamy kolumnę „Plan”,
  // żeby zwolnić miejsce na większe przyciski.
  const isNarrow = useIsNarrow();
  const hidePlanColumn = isNarrow && editingCell !== null;

  /**
   * Szablon kolumn trackera na telefonie.
   *
   * Gdy włączony jest tryb steppera, edytowana kolumna dostaje 2× więcej
   * miejsca (przyciski ± + pole na wpisanie wartości), a kolumna „Plan”
   * chodzi — dzięki temu nic nie wychodzi poza komórkę.
   *
   * UWAGA: klasy MUSZĄ być zapisane dosłownie — Tailwind nie rozpoznaje
   * nazw klas składanych dynamicznie (wtedy siatka się rozsypuje).
   */
  const mobileGridClass = (() => {
    const editingField = editingCell?.field;
    if (hidePlanColumn) {
      if (isUnilateral) {
        return editingField === 'reps'
          ? 'grid-cols-[44px_24px_28px_2fr_1fr]'
          : 'grid-cols-[44px_24px_28px_1fr_2fr]';
      }
      return editingField === 'reps'
        ? 'grid-cols-[44px_24px_2fr_1fr]'
        : 'grid-cols-[44px_24px_1fr_2fr]';
    }
    return isUnilateral
      ? 'grid-cols-[44px_24px_28px_1fr_1fr_1fr]'
      : 'grid-cols-[44px_24px_1fr_1fr_1fr]';
  })();

  /** Zwraca etykietę strony dla uni-lateralnych ćwiczeń: Prawa / Lewa */
  const getSideLabel = (idx: number): 'Prawa' | 'Lewa' => (idx % 2 === 0 ? 'Prawa' : 'Lewa');

  const toggleDone = (idx: number) => {
    const willBeDone = !localLogs[idx].done;
    // Znacznik czasu pozwala ustalić, który trening był zarejestrowany ostatnio
    updateLog(idx, { done: willBeDone, completedAt: willBeDone ? Date.now() : undefined });
  };

  /** Dodaje kolejną serię na końcu listy (poza zaplanowaną liczbą). */
  const addSet = () => {
    const newLog: SetLog = {
      id: `set-${localLogs.length + 1}-${Date.now()}-${Math.random()}`,
      setNumber: localLogs.length + 1,
      targetReps: defaultReps || '8-12',
      actualReps: null,
      weight: defaultWeight,
      done: false,
    };
    setLocalLogs(prev => {
      const next = [...prev, newLog];
      setTimeout(() => onChange(next), 0);
      return next;
    });
  };

  /** Usuwa ostatnią serię z listy. */
  const deleteLastSet = () => {
    if (localLogs.length <= 1) return; // Prevent removing all sets
    setLocalLogs(prev => {
      const next = prev.slice(0, -1).map((log, newIdx) => ({
        ...log,
        setNumber: newIdx + 1,
      }));
      setTimeout(() => onChange(next), 0);
      return next;
    });
  };

  /**
   * Komórka „Powt.” / „Kg” ze stepperem.
   *
   * Na tablecie i desktopie przyciski ± są widoczne od razu. Na telefonie
   * najpierw dotykamy wartości (kolumna „Plan” znika, przyciski robią się
   * duże), a wtedy można też wpisać dokładną wartość.
   */
  const renderStepperCell = (log: SetLog, idx: number, field: 'reps' | 'weight') => {
    const isEditing = editingCell?.setIdx === idx && editingCell.field === field;
    const isReps = field === 'reps';
    const value = isReps ? (log.actualReps ?? null) : (log.weight ?? null);

    const mode: StepperMode = !isNarrow
      ? 'inline'
      : (isEditing ? 'expanded' : 'compact');

    return (
      <div className="flex justify-center">
        <Stepper
          value={value}
          onChange={next => {
            if (isReps) updateLog(idx, { actualReps: next });
            else updateLog(idx, { weight: next });
          }}
          step={1}
          min={0}
          max={999}
          precision={isReps ? 0 : 1}
          tone={isReps ? 'violet' : 'amber'}
          mode={mode}
          label={isReps ? 'Powtórzenia' : 'Ciężar'}
          prefix={isReps ? undefined : (isDumbbell && !isUnilateral ? '2×' : undefined)}
          editing={isEditing}
          done={log.done}
          onBeginEdit={() => startEdit(idx, field)}
          onEditingChange={() => cancelEdit()}
        />
      </div>
    );
  };

  const completedSets = localLogs.filter(s => s.done).length;
  // For dumbbell exercises, weight is per-dumbbell (e.g. 20 kg per dumbbell = 40 kg total)
  // so multiply by 2 for total volume calculation
  // BUT for unilateral exercises (single-arm/leg), weight is already for one side, so don't double
  const effectiveWeight = (s: SetLog) => isDumbbell && !isUnilateral && s.weight != null ? s.weight * 2 : s.weight;
  const totalVolume = localLogs
    .filter(s => s.done && s.actualReps != null && s.weight != null)
    .reduce((acc, s) => acc + (s.actualReps! * effectiveWeight(s)!), 0);

  const avgReps = (() => {
    const done = localLogs.filter(s => s.done && s.actualReps != null);
    return done.length > 0
      ? (done.reduce((a, s) => a + s.actualReps!, 0) / done.length).toFixed(1)
      : null;
  })();

  const maxWeight = (() => {
    const done = localLogs.filter(s => s.done && s.weight != null);
    // For dumbbell exercises, show doubled weight (both dumbbells)
    return done.length > 0 ? Math.max(...done.map(s => effectiveWeight(s)!)) : null;
  })();

  if (isCardio) {
    // Cardio nie ma serii — ma JEDEN zapis, którym oznaczamy wykonanie
    // (w `actualReps` trzymamy zliczone minuty).
    //
    // Stan bierzemy z PROPS, a nie z lokalnej kopii `localLogs`: oznaczenie
    // można zmienić także z badge'a na karcie ćwiczenia, więc lokalna kopia
    // potrafiła pokazywać stan sprzed kilku kliknięć (panel mówił
    // „Oznacz jako zrobione", a ćwiczenie było już zaliczone).
    const cardioLog = setLogs[0];
    const cardioDone = !!cardioLog?.done;
    const plannedMinutes = duration ?? CARDIO_DEFAULT_MINUTES;
    const currentMinutes = cardioLog?.actualReps ?? plannedMinutes;

    // Minuty wpisujemy ręcznie (trening trwał 25 min, a w planie było 20).
    // Zapisujemy je dopiero po wyjściu z pola — inaczej każde kliknięcie
    // klawiatza zapisywałoby plan do chmury.
    const [minutesInput, setMinutesInput] = useState(String(currentMinutes));
    useEffect(() => {
      setMinutesInput(String(currentMinutes));
    }, [currentMinutes]);

    const commitMinutes = (raw: string) => {
      const parsed = parseInt(raw, 10);
      const minutes = Number.isFinite(parsed) ? Math.max(0, Math.min(600, parsed)) : plannedMinutes;
      setMinutesInput(String(minutes));
      if (minutes === currentMinutes) return;
      onChange(buildCardioLog(setLogs, plannedMinutes, { minutes }));
    };

    const toggleCardioDone = () => {
      const minutes = parseInt(minutesInput, 10);
      const effective = Number.isFinite(minutes) ? minutes : plannedMinutes;
      onChange(buildCardioLog(setLogs, plannedMinutes, {
        done: !cardioDone,
        minutes: effective,
      }));
    };

    return (
      <div className={`mt-2 rounded-xl border px-3 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        cardioDone
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-sky-100 bg-sky-50'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <TimerIcon className="h-4 w-4 flex-shrink-0 text-sky-700" />
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${cardioDone ? 'text-emerald-700' : 'text-sky-700'}`}>
              Czas trwania
            </p>
            <p className={`text-[11px] ${cardioDone ? 'text-emerald-700/80' : 'text-sky-700/80'}`}>
              Plan: {plannedMinutes} min
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${cardioDone ? 'text-emerald-700/80' : 'text-sky-700/80'}`}>
              Wykonano
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={600}
              value={minutesInput}
              aria-label="Minuty wykonanego cardio"
              onChange={e => setMinutesInput(e.target.value)}
              onBlur={e => commitMinutes(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitMinutes((e.target as HTMLInputElement).value);
              }}
              className="w-16 rounded-lg border border-sky-100 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span className={`text-xs font-semibold ${cardioDone ? 'text-emerald-700' : 'text-sky-700'}`}>min</span>
          </label>

          <button
            onClick={toggleCardioDone}
            aria-pressed={cardioDone}
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
              cardioDone
                ? 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-50'
                : 'border-sky-100 bg-white text-sky-700 hover:bg-sky-50'
            }`}
          >
            {cardioDone ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                Cofnij oznaczenie
              </>
            ) : (
              'Oznacz jako zrobione'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Serie</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
            {completedSets}/{localLogs.length}
          </span>
        </div>
        {totalVolume > 0 && (
          <span className="text-[10px] font-semibold text-slate-500">
            <span className="text-violet-700 font-bold">{totalVolume.toLocaleString()} kg</span> obj.
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${localLogs.length > 0 ? (completedSets / localLogs.length) * 100 : 0}%` }}
        />
      </div>

      {/* Column headers - mobile */}
      <div className={`sm:hidden grid gap-x-1 px-2 py-1.5 border-b border-slate-100 bg-white/[0.04] ${mobileGridClass}`}>
        <div className="flex justify-center text-[10px] font-bold text-slate-400 text-center">
          <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
        </div>
        <div className="text-[10px] font-bold text-slate-400 text-center">#</div>
        {isUnilateral && (
          <div className="text-[9px] font-bold text-slate-400 text-center truncate">Str.</div>
        )}
        {!hidePlanColumn && (
          <div className="text-[10px] font-bold text-slate-400 text-center">Plan</div>
        )}
        <div className="text-[10px] font-bold text-slate-400 text-center">Powt.</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">
          {isDumbbell && !isUnilateral ? 'Kg (2 x)' : 'Kg'}
        </div>
      </div>

      {/* Column headers - desktop */}
      <div className={`hidden sm:grid gap-x-1 px-2 py-1.5 border-b border-slate-100 bg-white/[0.04] ${
        isUnilateral
          ? 'grid-cols-[44px_28px_44px_1fr_1fr_1fr]'
          : 'grid-cols-[44px_28px_1fr_1fr_1fr]'
      }`}>
        <div className="flex justify-center text-[10px] font-bold text-slate-400 text-center">
          <CheckIcon className="h-3 w-3" strokeWidth={2.6} />
        </div>
        <div className="text-[10px] font-bold text-slate-400 text-center">#</div>
        {isUnilateral && (
          <div className="text-[10px] font-bold text-slate-400 text-center truncate">Strona</div>
        )}
        <div className="text-[10px] font-bold text-slate-400 text-center">Plan</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">Powt.</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">
          {isDumbbell && !isUnilateral ? 'Kg (2 x)' : 'Kg'}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {localLogs.map((log, idx) => {
          return (
            <Fragment key={log.id}>
              {/* Row - mobile */}
              <div className={`sm:hidden grid gap-x-1 items-center px-2 py-1.5 transition-colors ${mobileGridClass} ${log.done ? 'bg-emerald-50/70' : 'bg-white/[0.02]'}`}
              >
                {/* Checkbox */}
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleDone(idx)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border-2 active:scale-95 ${
                      log.done
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'border-slate-200 bg-white text-transparent hover:border-violet-400'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>

                {/* Set number */}
                <div className={`text-xs font-bold text-center ${log.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {log.setNumber}
                </div>

                {/* Side label for unilateral exercises - mobile: larger P/L */}
                {isUnilateral && (
                  <div className="text-xs font-bold text-center text-violet-700 px-0.5 truncate">
                    {getSideLabel(idx) === 'Prawa' ? 'P' : 'L'}
                  </div>
                )}

                {/* Target reps */}
                {!hidePlanColumn && (
                  <div className="text-xs text-center text-slate-400 font-medium truncate px-0.5">
                    {log.targetReps || '—'}
                  </div>
                )}

                {/* Actual reps */}
                {renderStepperCell(log, idx, 'reps')}

                {/* Weight */}
                {renderStepperCell(log, idx, 'weight')}
              </div>

              {/* Row - desktop */}
              <div className={`hidden sm:grid gap-x-1 items-center px-2 py-1.5 transition-colors ${
                isUnilateral
                  ? 'grid-cols-[44px_28px_44px_1fr_1fr_1fr]'
                  : 'grid-cols-[44px_28px_1fr_1fr_1fr]'
              } ${log.done ? 'bg-emerald-50/70' : 'bg-white/[0.02]'}`}
              >
                {/* Checkbox */}
                <div className="flex justify-center">
                  <button
                    onClick={() => toggleDone(idx)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border-2 active:scale-95 ${
                      log.done
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : 'border-slate-200 bg-white text-transparent hover:border-violet-400'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>

                {/* Set number */}
                <div className={`text-xs font-bold text-center ${log.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {log.setNumber}
                </div>

                {/* Side label for unilateral exercises - desktop: full text */}
                {isUnilateral && (
                  <div className="text-xs font-bold text-center text-violet-700 px-1 truncate">
                    {getSideLabel(idx)}
                  </div>
                )}

                {/* Target reps */}
                <div className="text-xs text-center text-slate-400 font-medium truncate px-0.5">
                  {log.targetReps || '—'}
                </div>

                {/* Actual reps */}
                {renderStepperCell(log, idx, 'reps')}

                {/* Weight */}
                {renderStepperCell(log, idx, 'weight')}
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Add set button */}
      <button
        onClick={addSet}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-50 active:bg-violet-100 transition-colors cursor-pointer border-t border-dashed border-slate-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Dodaj serię
      </button>

      {/* Delete last set button */}
      {localLogs.length > 1 && (
        <button
          onClick={deleteLastSet}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer border-t border-dashed border-slate-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Usuń serię
        </button>
      )}

      {/* Footer summary */}
      {completedSets > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 bg-white/[0.04]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              {avgReps && (
                <span className="text-[10px] text-slate-500">
                  Śr.: <span className="font-bold text-violet-700">{avgReps} powt.</span>
                </span>
              )}
              {maxWeight != null && (
                <span className="text-[10px] text-slate-500">
                  Maks: <span className="font-bold text-amber-600">{maxWeight} kg</span>
                </span>
              )}
              {totalVolume > 0 && (
                <span className="text-[10px] text-slate-500">
                  Obj.: <span className="font-bold text-indigo-600">{totalVolume.toLocaleString()} kg</span>
                </span>
              )}
            </div>
            {completedSets === localLogs.length && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Ukończone!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          {isDumbbell && !isUnilateral ? (
            <>Wpisuj wagę <span className="font-semibold">jednego hantla</span> — liczone 2×</>
          ) : isDumbbell && isUnilateral ? (
            <>Wpisuj wagę <span className="font-semibold">jednego hantla</span> (jednostronnie)</>
          ) : (
            <>Dotknij <span className="font-semibold">Powt.</span> lub <span className="font-semibold">Kg</span> aby wpisać · <span className="font-semibold">±</span> zmienia wartość · <CheckIcon className="inline h-3 w-3 -mt-0.5" strokeWidth={2.6} /> gdy seria gotowa</>
          )}
        </p>
      </div>
    </div>
  );
}
