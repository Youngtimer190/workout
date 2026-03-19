import { useState, memo } from 'react';
import { WorkoutDay, Exercise } from '../types';
import ExerciseCard from './ExerciseCard';

interface DayColumnProps {
  day: WorkoutDay;
  index: number;
  onToggleRest: () => void;
  onRemoveExercise: (exerciseId: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onRequestAdd: () => void;
  onRequestReplace: (exercise: Exercise) => void;
}

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function DayColumn({
  day,
  index,
  onToggleRest,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  onRequestAdd,
  onRequestReplace,
}: DayColumnProps) {
  const [collapsed, setCollapsed] = useState(false);

  const totalSets = day.exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const completedExercises = day.exercises.filter(e =>
    e.setLogs && e.setLogs.length > 0 && e.setLogs.every(s => s.done)
  ).length;
  const shortLabel = DAY_LABELS[index] ?? '';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
      day.isRestDay ? 'border-slate-100 opacity-80' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
    }`}>

      {/* Header */}
      <div
        className={`bg-gradient-to-r ${day.color} cursor-pointer select-none`}
        onClick={() => setCollapsed(prev => !prev)}
      >
        <div className="flex items-center gap-3 px-4 py-3.5">

          {/* Day badge */}
          <div className="w-10 h-10 rounded-xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm leading-tight">{shortLabel}</span>
          </div>

          {/* Day info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight truncate">{day.name}</p>
            {day.isRestDay ? (
              <p className="text-white/70 text-xs mt-0.5">🌙 Dzień odpoczynku</p>
            ) : day.exercises.length === 0 ? (
              <p className="text-white/70 text-xs mt-0.5">Brak ćwiczeń – kliknij aby dodać</p>
            ) : (
              <p className="text-white/70 text-xs mt-0.5">
                {day.exercises.length} ćw.
                {totalSets > 0 && ` · ${totalSets} serii`}
                {completedExercises > 0 && ` · ✓ ${completedExercises}/${day.exercises.length}`}
              </p>
            )}
          </div>

          {/* Progress pill */}
          {!day.isRestDay && day.exercises.length > 0 && completedExercises > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1 flex-shrink-0">
              <span className="text-white text-xs font-bold">{completedExercises}/{day.exercises.length}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Rest toggle */}
            <button
              onClick={e => { e.stopPropagation(); onToggleRest(); }}
              title={day.isRestDay ? 'Ustaw jako dzień treningowy' : 'Ustaw jako dzień odpoczynku'}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
            >
              {day.isRestDay ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              )}
            </button>

            {/* Add exercise */}
            {!day.isRestDay && (
              <button
                onClick={e => { e.stopPropagation(); onRequestAdd(); }}
                title="Dodaj ćwiczenie"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}

            {/* Collapse chevron */}
            <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <div className="p-3 sm:p-4">
          {day.isRestDay ? (
            <div className="flex items-center justify-between py-2 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl flex-shrink-0">😴</span>
                <div className="min-w-0">
                  <p className="text-slate-600 font-semibold text-sm">Dzień odpoczynku</p>
                  <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">Regeneracja mięśni jest kluczowa dla postępów</p>
                </div>
              </div>
              <button
                onClick={onToggleRest}
                className="text-xs text-violet-500 hover:text-violet-700 font-semibold underline underline-offset-2 transition-colors cursor-pointer flex-shrink-0"
              >
                Zamień na trening
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {day.exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-4xl mb-2">🏋️</span>
                  <p className="text-slate-500 font-semibold text-sm">Brak ćwiczeń</p>
                  <p className="text-slate-400 text-xs mt-1">Dodaj pierwsze ćwiczenie do tego dnia</p>
                </div>
              ) : (
                <>
                  {day.exercises.length > 1 && (
                    <p className="text-center text-[11px] text-slate-400 pb-0.5">
                      Użyj przycisków ▲▼ aby zmienić kolejność ćwiczeń
                    </p>
                  )}
                  <div className="space-y-2">
                    {day.exercises.map((exercise, exIndex) => (
                      <div key={exercise.id} className="flex gap-2 items-stretch">

                        {/* Order buttons — always visible, large touch targets */}
                        {day.exercises.length > 1 && (
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button
                              onClick={() => onMoveExercise(exercise.id, 'up')}
                              disabled={exIndex === 0}
                              className={`flex-1 w-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                exIndex === 0
                                  ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                                  : 'bg-slate-100 hover:bg-violet-100 active:bg-violet-200 text-slate-400 hover:text-violet-600'
                              }`}
                              title="Przesuń wyżej"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M18 15l-6-6-6 6" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onMoveExercise(exercise.id, 'down')}
                              disabled={exIndex === day.exercises.length - 1}
                              className={`flex-1 w-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                exIndex === day.exercises.length - 1
                                  ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                                  : 'bg-slate-100 hover:bg-violet-100 active:bg-violet-200 text-slate-400 hover:text-violet-600'
                              }`}
                              title="Przesuń niżej"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </div>
                        )}

                        {/* Exercise card */}
                        <div className="flex-1 min-w-0">
                          <ExerciseCard
                            exercise={exercise}
                            onRemove={() => onRemoveExercise(exercise.id)}
                            onUpdate={updates => onUpdateExercise(exercise.id, updates)}
                            onReplace={() => onRequestReplace(exercise)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Add exercise button */}
              <button
                onClick={onRequestAdd}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 active:bg-violet-100/50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Dodaj ćwiczenie
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DayColumn);
