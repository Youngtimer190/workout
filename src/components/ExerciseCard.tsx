import { useState, useRef, useCallback } from 'react';
import { Exercise, SetLog } from '../types';
import { muscleGroupBgColors } from '../data/exercises';
import SetTracker from './SetTracker';

interface ExerciseCardProps {
  exercise: Exercise;
  onRemove: () => void;
  onUpdate: (updates: Partial<Exercise>) => void;
  onReplace: () => void;
}

export default function ExerciseCard({ exercise, onRemove, onUpdate, onReplace }: ExerciseCardProps) {
  const [editing, setEditing] = useState(false);
  const [showSets, setShowSets] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Local edit state — initialized once from props, NOT re-synced from props
  const [sets, setSets] = useState(String(exercise.sets || 3));
  const [reps, setReps] = useState(exercise.reps || '8-12');
  const [weight, setWeight] = useState(String(exercise.weight ?? ''));
  const [notes, setNotes] = useState(exercise.notes || '');

  // Track if edit form is open to prevent prop changes from resetting local state
  const editingRef = useRef(editing);
  editingRef.current = editing;

  const isCardio = exercise.muscleGroup === 'Cardio';

  const handleOpenEdit = () => {
    // Re-sync local state from latest props only when opening the edit form
    setSets(String(exercise.sets || 3));
    setReps(exercise.reps || '8-12');
    setWeight(String(exercise.weight ?? ''));
    setNotes(exercise.notes || '');
    setShowSets(false);
    setEditing(true);
  };

  const handleCloseEdit = () => {
    setEditing(false);
  };

  function buildSyncedLogs(existing: SetLog[], count: number, targetReps: string, defaultWeight: number | null): SetLog[] {
    const result: SetLog[] = [];
    for (let i = 0; i < count; i++) {
      if (existing[i]) {
        result.push({ ...existing[i], setNumber: i + 1, targetReps });
      } else {
        result.push({
          id: `set-${i + 1}-${Date.now()}-${Math.random()}`,
          setNumber: i + 1,
          targetReps,
          actualReps: null,
          weight: defaultWeight,
          done: false,
        });
      }
    }
    return result;
  }

  const handleSave = () => {
    const newSets = isCardio ? 1 : (parseInt(sets) || 3);
    const newReps = isCardio ? '' : reps;
    const newWeight = weight ? parseFloat(weight) : undefined;
    onUpdate({
      sets: newSets,
      reps: newReps,
      weight: newWeight,
      notes: notes || undefined,
      setLogs: isCardio ? [] : buildSyncedLogs(
        exercise.setLogs ?? [],
        newSets,
        newReps,
        newWeight ?? null
      ),
    });
    setEditing(false);
  };

  // Stable callback — does NOT cause ExerciseCard to re-render its edit inputs
  const handleSetLogsChange = useCallback((logs: SetLog[]) => {
    onUpdate({ setLogs: logs });
  }, [onUpdate]);

  const setLogs = exercise.setLogs ?? [];
  const completedSets = setLogs.filter(s => s.done).length;
  const totalSets = exercise.sets || 3;
  const isFullyDone = !isCardio && setLogs.length > 0 && completedSets === totalSets;
  const hasProgress = setLogs.some(s => s.done || s.actualReps != null || s.weight != null);

  return (
    <>
      <div className={`group bg-white rounded-xl border transition-all ${
        isFullyDone
          ? 'border-emerald-200 shadow-sm shadow-emerald-100 bg-emerald-50/20'
          : 'border-slate-100 hover:border-violet-200 hover:shadow-sm'
      }`}>

        {/* ── Main row ── */}
        <div className="flex items-start gap-2.5 p-3">

          {/* Status indicator */}
          <div className="flex-shrink-0 mt-0.5">
            {!isCardio && setLogs.length > 0 ? (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                isFullyDone
                  ? 'bg-emerald-500 text-white'
                  : completedSets > 0
                  ? 'bg-amber-400 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {isFullyDone ? '✓' : completedSets > 0 ? completedSets : '○'}
              </div>
            ) : (
              <div className="text-slate-200 mt-1 cursor-grab active:cursor-grabbing">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 leading-snug break-words pr-1">
                  {exercise.name}
                </p>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  muscleGroupBgColors[exercise.muscleGroup] || 'bg-slate-100 text-slate-500'
                }`}>
                  {exercise.muscleGroup}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5 -mr-0.5">
                {/* Replace */}
                <button
                  onClick={() => { setEditing(false); setShowSets(false); onReplace(); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 active:bg-amber-100 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                  title="Zamień ćwiczenie"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
                {/* Edit */}
                <button
                  onClick={editing ? handleCloseEdit : handleOpenEdit}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    editing ? 'bg-violet-100 text-violet-600' : 'hover:bg-slate-100 active:bg-slate-200 text-slate-300 hover:text-violet-600'
                  }`}
                  title="Edytuj parametry"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                {/* Delete */}
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 active:bg-red-100 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                  title="Usuń"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {isCardio ? (
                <span className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                  ⏱ {exercise.duration} min
                </span>
              ) : (
                <>
                  {exercise.sets && (
                    <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                      {exercise.sets} serie
                    </span>
                  )}
                  {exercise.reps && (
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {exercise.reps} powt.
                    </span>
                  )}
                  {exercise.weight && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {exercise.weight} kg
                    </span>
                  )}
                  {setLogs.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isFullyDone
                        ? 'bg-emerald-50 text-emerald-700'
                        : completedSets > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {isFullyDone ? '✓ Ukończone' : `${completedSets}/${totalSets} serii`}
                    </span>
                  )}
                </>
              )}
            </div>

            {exercise.notes && !editing && (
              <p className="text-xs text-slate-400 mt-1.5 italic leading-snug">📝 {exercise.notes}</p>
            )}
          </div>
        </div>

        {/* ── Remove confirmation ── */}
        {showRemoveConfirm && (
          <div className="mx-3 mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 flex items-center justify-between gap-3 animate-in">
            <p className="text-xs text-red-700 font-medium">Usunąć to ćwiczenie?</p>
            <div className="flex items-center gap-2">
              <button
                onClick={onRemove}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold active:bg-red-600 transition-colors cursor-pointer"
              >
                Usuń
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-semibold border border-slate-200 active:bg-slate-50 transition-colors cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* ── Set tracker toggle ── */}
        {!isCardio && !editing && !showRemoveConfirm && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setShowSets(prev => !prev)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer w-full sm:w-auto justify-center sm:justify-start ${
                showSets
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                  : hasProgress
                  ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-violet-600'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {showSets ? 'Ukryj serie' : hasProgress ? 'Pokaż postęp' : 'Śledź serie'}
              {!showSets && completedSets > 0 && (
                <span className="ml-0.5 bg-violet-200 text-violet-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {completedSets}/{totalSets}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── Set tracker panel ── */}
        {showSets && !editing && (
          <div className="px-3 pb-3">
            <SetTracker
              sets={exercise.sets || 3}
              defaultReps={exercise.reps || '8-12'}
              defaultWeight={exercise.weight ?? null}
              setLogs={exercise.setLogs ?? []}
              isCardio={isCardio}
              duration={exercise.duration}
              onChange={handleSetLogsChange}
            />
          </div>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <div className="px-3 pb-3 border-t border-slate-100 pt-3 space-y-3">
            {isCardio ? (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Czas (min)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={exercise.duration}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  readOnly
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Serie</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={sets}
                    min="1"
                    onChange={e => setSets(e.target.value)}
                    className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Powt.</label>
                  <input
                    type="text"
                    inputMode="text"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    placeholder="8-12"
                    className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Kg</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    min="0"
                    step="0.5"
                    onChange={e => setWeight(e.target.value)}
                    className="w-full px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 text-center"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Notatki</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="np. Powolne opuszczanie..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 active:bg-violet-800 transition-colors cursor-pointer"
              >
                Zapisz
              </button>
              <button
                onClick={handleCloseEdit}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>


    </>
  );
}
