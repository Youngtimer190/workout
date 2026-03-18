import { useState } from 'react';
import { WorkoutDay, Exercise } from '../types';
import { WeekMeta } from '../store/weekStore';
import DayColumn from './DayColumn';
import WeekNavigator from './WeekNavigator';

interface WorkoutPlannerProps {
  days: WorkoutDay[];
  weekMeta: WeekMeta;
  onToggleRest: (dayId: string) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  onUpdateExercise: (dayId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onReplaceExercise: (dayId: string, exerciseId: string, newExercise: Exercise) => void;
  onReorderExercises: (dayId: string, exercises: Exercise[]) => void;
  onResetWeek: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  onCopyFromPrevWeek: () => void;
  customExercises?: Exercise[];
  onSaveCustomExercise?: (exercise: Exercise) => void;
}

export default function WorkoutPlanner({
  days,
  weekMeta,
  onToggleRest,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  onReplaceExercise,
  onReorderExercises,
  onResetWeek,
  onPrevWeek,
  onNextWeek,
  onGoToCurrentWeek,
  onCopyFromPrevWeek,
  customExercises = [],
  onSaveCustomExercise,
}: WorkoutPlannerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalExercises = days.reduce((acc, d) => acc + d.exercises.length, 0);
  const trainingDays = days.filter(d => !d.isRestDay && d.exercises.length > 0).length;
  const restDays = days.filter(d => d.isRestDay).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Planer tygodniowy</h1>
          <p className="text-slate-500 text-sm mt-0.5">Zarządzaj treningami i śledź progres</p>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all cursor-pointer self-start sm:self-auto flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
          Resetuj tydzień
        </button>
      </div>

      {/* Reset confirmation dialog */}
      {showResetConfirm && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm animate-in">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">Resetować cały plan tego tygodnia?</p>
              <p className="text-xs text-red-500 mt-0.5">Wszystkie ćwiczenia i dane serii zostaną usunięte. Tej operacji nie można cofnąć.</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-12 sm:ml-0">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Anuluj
            </button>
            <button
              onClick={() => { onResetWeek(); setShowResetConfirm(false); }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer shadow-sm"
            >
              Tak, resetuj
            </button>
          </div>
        </div>
      )}

      {/* Week Navigator */}
      <WeekNavigator
        weekMeta={weekMeta}
        onPrev={onPrevWeek}
        onNext={onNextWeek}
        onGoToday={onGoToCurrentWeek}
        onCopyFromPrev={onCopyFromPrevWeek}
        trainingDays={trainingDays}
        restDays={restDays}
        totalExercises={totalExercises}
      />

      {/* Days list */}
      <div className="space-y-2">
        {days.map((day, index) => (
          <DayColumn
            key={day.id}
            day={day}
            index={index}
            onToggleRest={() => onToggleRest(day.id)}
            onAddExercise={ex => onAddExercise(day.id, ex)}
            onRemoveExercise={exId => onRemoveExercise(day.id, exId)}
            onUpdateExercise={(exId, updates) => onUpdateExercise(day.id, exId, updates)}
            onReplaceExercise={(exId, newEx) => onReplaceExercise(day.id, exId, newEx)}
            onReorderExercises={exercises => onReorderExercises(day.id, exercises)}
            customExercises={customExercises}
            onSaveCustomExercise={onSaveCustomExercise}
          />
        ))}
      </div>
    </div>
  );
}
