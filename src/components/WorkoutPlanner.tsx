import { useState, useCallback, useRef } from 'react';
import { WorkoutDay, Exercise } from '../types';
import { WeekMeta } from '../store/weekStore';
import DayColumn from './DayColumn';
import WeekNavigator from './WeekNavigator';
import AddExerciseModal from './AddExerciseModal';
import ReplaceExerciseModal from './ReplaceExerciseModal';
import CreateExerciseModal from './CreateExerciseModal';

interface WorkoutPlannerProps {
  days: WorkoutDay[];
  weekMeta: WeekMeta;
  onToggleRest: (dayId: string) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  onUpdateExercise: (dayId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onReplaceExercise: (dayId: string, exerciseId: string, newExercise: Exercise) => void;
  onMoveExercise: (dayId: string, exerciseId: string, direction: 'up' | 'down') => void;
  onResetWeek: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  onCopyFromPrevWeek: () => void;
  customExercises?: Exercise[];
  onSaveCustomExercise?: (exercise: Exercise) => void;
  onDeleteCustomExercise?: (id: string) => void;
}

// Modal state type
type ModalState =
  | { type: 'none' }
  | { type: 'add'; dayId: string; dayName: string }
  | { type: 'replace'; dayId: string; exercise: Exercise }
  | { type: 'create'; dayId: string };

export default function WorkoutPlanner({
  days,
  weekMeta,
  onToggleRest,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  onReplaceExercise,
  onMoveExercise,
  onResetWeek,
  onPrevWeek,
  onNextWeek,
  onGoToCurrentWeek,
  onCopyFromPrevWeek,
  customExercises = [],
  onSaveCustomExercise,
  onDeleteCustomExercise,
}: WorkoutPlannerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const modalRef = useRef(modal);
  modalRef.current = modal;

  const daysRef = useRef(days);
  daysRef.current = days;

  const totalExercises = days.reduce((acc, d) => acc + d.exercises.length, 0);
  const trainingDays = days.filter(d => !d.isRestDay && d.exercises.length > 0).length;
  const restDays = days.filter(d => d.isRestDay).length;

  const handleRequestAdd = useCallback((dayId: string, dayName: string) => {
    setModal({ type: 'add', dayId, dayName });
  }, []);

  const handleRequestReplace = useCallback((dayId: string, exercise: Exercise) => {
    setModal({ type: 'replace', dayId, exercise });
  }, []);

  const handleRequestCreate = useCallback((dayId: string) => {
    setModal({ type: 'create', dayId });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ type: 'none' });
  }, []);

  const handleAdd = useCallback((exercise: Exercise) => {
    const m = modalRef.current;
    if (m.type === 'add') {
      onAddExercise(m.dayId, exercise);
      setModal({ type: 'none' });
    }
  }, [onAddExercise]);

  const handleReplace = useCallback((newExercise: Exercise) => {
    const m = modalRef.current;
    if (m.type === 'replace') {
      onReplaceExercise(m.dayId, m.exercise.id, newExercise);
      setModal({ type: 'none' });
    }
  }, [onReplaceExercise]);

  const handleSaveCustom = useCallback((exercise: Exercise) => {
    onSaveCustomExercise?.(exercise);
    const m = modalRef.current;
    if (m.type === 'create') {
      const dayId = m.dayId;
      const day = daysRef.current.find((d: WorkoutDay) => d.id === dayId);
      setModal({ type: 'add', dayId, dayName: day?.name ?? '' });
    }
  }, [onSaveCustomExercise]);

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
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
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
            onRemoveExercise={(exId) => onRemoveExercise(day.id, exId)}
            onUpdateExercise={(exId, updates) => onUpdateExercise(day.id, exId, updates)}
            onMoveExercise={(exId, dir) => onMoveExercise(day.id, exId, dir)}
            onRequestAdd={() => handleRequestAdd(day.id, day.name)}
            onRequestReplace={(exercise) => handleRequestReplace(day.id, exercise)}
          />
        ))}
      </div>

      {/* ── Global Modals — rendered once at WorkoutPlanner level ── */}

      {modal.type === 'add' && (
        <AddExerciseModal
          key={`add-${modal.dayId}`}
          dayName={modal.dayName}
          onAdd={handleAdd}
          onClose={closeModal}
          customExercises={customExercises}
          onSaveCustom={onSaveCustomExercise}
          onDeleteCustom={onDeleteCustomExercise}
          onRequestCreate={() => handleRequestCreate(modal.dayId)}
        />
      )}

      {modal.type === 'replace' && (
        <ReplaceExerciseModal
          currentExercise={modal.exercise}
          onReplace={handleReplace}
          onClose={closeModal}
          customExercises={customExercises}
        />
      )}

      {modal.type === 'create' && (
        <CreateExerciseModal
          key="create"
          onSave={handleSaveCustom}
          onClose={() => {
            const dayId = modal.dayId;
            const day = days.find(d => d.id === dayId);
            setModal({ type: 'add', dayId, dayName: day?.name ?? '' });
          }}
        />
      )}
    </div>
  );
}


