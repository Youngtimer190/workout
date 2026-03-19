import { useState, useEffect, useRef } from 'react';
import { SetLog } from '../types';

interface SetTrackerProps {
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
  sets,
  defaultReps,
  defaultWeight,
  setLogs,
  isCardio = false,
  duration,
  onChange,
}: SetTrackerProps) {
  // Local copy of logs — never re-synced from props while editing
  const [localLogs, setLocalLogs] = useState<SetLog[]>(() =>
    buildLogs(setLogs, sets, defaultReps, defaultWeight)
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

  // Editing cell state
  const [editingCell, setEditingCell] = useState<{ setIdx: number; field: 'reps' | 'weight' } | null>(null);
  const [tempValue, setTempValue] = useState('');

  const updateLog = (idx: number, updates: Partial<SetLog>) => {
    setLocalLogs(prev => {
      const next = prev.map((s, i) => (i === idx ? { ...s, ...updates } : s));
      // Push to parent after state update
      setTimeout(() => onChange(next), 0);
      return next;
    });
  };

  const startEdit = (setIdx: number, field: 'reps' | 'weight', current: string) => {
    isEditingRef.current = true;
    setEditingCell({ setIdx, field });
    setTempValue(current);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { setIdx, field } = editingCell;
    if (field === 'reps') {
      updateLog(setIdx, { actualReps: tempValue === '' ? null : Number(tempValue) });
    } else if (field === 'weight') {
      updateLog(setIdx, { weight: tempValue === '' ? null : Number(tempValue) });
    }
    setEditingCell(null);
    setTempValue('');
    isEditingRef.current = false;
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setTempValue('');
    isEditingRef.current = false;
  };

  const toggleDone = (idx: number) => {
    updateLog(idx, { done: !localLogs[idx].done });
  };

  const completedSets = localLogs.filter(s => s.done).length;
  const totalVolume = localLogs
    .filter(s => s.done && s.actualReps != null && s.weight != null)
    .reduce((acc, s) => acc + (s.actualReps! * s.weight!), 0);

  const avgReps = (() => {
    const done = localLogs.filter(s => s.done && s.actualReps != null);
    return done.length > 0
      ? (done.reduce((a, s) => a + s.actualReps!, 0) / done.length).toFixed(1)
      : null;
  })();

  const maxWeight = (() => {
    const done = localLogs.filter(s => s.done && s.weight != null);
    return done.length > 0 ? Math.max(...done.map(s => s.weight!)) : null;
  })();

  if (isCardio) {
    return (
      <div className="mt-2 rounded-xl border border-sky-100 bg-sky-50/50 px-4 py-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-sky-700">⏱ Czas trwania</span>
        <span className="text-sm font-bold text-sky-800">{duration ?? '—'} min</span>
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
            {completedSets}/{sets}
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
          style={{ width: `${sets > 0 ? (completedSets / sets) * 100 : 0}%` }}
        />
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[44px_28px_1fr_1fr_1fr] gap-x-1 px-2 py-1.5 border-b border-slate-100 bg-white/70">
        <div className="text-[10px] font-bold text-slate-400 text-center">✓</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">#</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">Plan</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">Powt.</div>
        <div className="text-[10px] font-bold text-slate-400 text-center">Kg</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {localLogs.map((log, idx) => {
          const isEditingReps = editingCell?.setIdx === idx && editingCell.field === 'reps';
          const isEditingWeight = editingCell?.setIdx === idx && editingCell.field === 'weight';

          return (
            <div
              key={log.id}
              className={`grid grid-cols-[44px_28px_1fr_1fr_1fr] gap-x-1 items-center px-2 py-1.5 transition-colors ${
                log.done ? 'bg-emerald-50/70' : 'bg-white/50'
              }`}
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

              {/* Target reps */}
              <div className="text-xs text-center text-slate-400 font-medium truncate px-0.5">
                {log.targetReps || '—'}
              </div>

              {/* Actual reps */}
              <div className="flex justify-center">
                {isEditingReps ? (
                  <input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={tempValue}
                    onChange={e => setTempValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(); }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-full text-center text-xs font-bold px-1 py-2.5 rounded-lg border-2 border-violet-400 bg-white focus:outline-none text-slate-800"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(idx, 'reps', log.actualReps != null ? String(log.actualReps) : '')}
                    className={`w-full text-center text-xs font-bold py-2.5 px-1 rounded-lg border-2 transition-all cursor-pointer active:scale-95 ${
                      log.actualReps != null
                        ? log.done
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : 'border-violet-200 bg-violet-50 text-violet-800'
                        : 'border-dashed border-slate-200 bg-transparent text-slate-300 hover:border-violet-300 hover:text-violet-400'
                    }`}
                  >
                    {log.actualReps != null ? log.actualReps : '—'}
                  </button>
                )}
              </div>

              {/* Weight */}
              <div className="flex justify-center">
                {isEditingWeight ? (
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={tempValue}
                    onChange={e => setTempValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(); }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-full text-center text-xs font-bold px-1 py-2.5 rounded-lg border-2 border-amber-400 bg-white focus:outline-none text-slate-800"
                  />
                ) : (
                  <button
                    onClick={() => startEdit(idx, 'weight', log.weight != null ? String(log.weight) : '')}
                    className={`w-full text-center text-xs font-bold py-2.5 px-1 rounded-lg border-2 transition-all cursor-pointer active:scale-95 ${
                      log.weight != null
                        ? log.done
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-dashed border-slate-200 bg-transparent text-slate-300 hover:border-amber-300 hover:text-amber-400'
                    }`}
                  >
                    {log.weight != null ? log.weight : '—'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      {completedSets > 0 && (
        <div className="px-3 py-2 border-t border-slate-100 bg-white/70">
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
            {completedSets === sets && (
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
          Dotknij <span className="font-semibold">Powt.</span> lub <span className="font-semibold">Kg</span> aby wpisać · ✓ gdy seria gotowa
        </p>
      </div>
    </div>
  );
}
