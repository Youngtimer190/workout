import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkoutDay, Exercise, WorkoutTemplate } from '../types';
import { WeekMeta, DAY_NAMES } from '../store/weekStore';
import { RemovedExercise } from '../store/workoutStore';
import DayColumn from './DayColumn';
import WeekNavigator from './WeekNavigator';
import AddExerciseModal from './AddExerciseModal';
import ReplaceExerciseModal from './ReplaceExerciseModal';
import CreateExerciseModal from './CreateExerciseModal';
import CopyWorkoutModal from './CopyWorkoutModal';

/** Ile sekund użytkownik ma na cofnięcie operacji. */
const UNDO_WINDOW_MS = 8000;

interface UndoRemoveBarProps {
  /** Kolejka cofnięć — pasek pokazuje ostatni wpis. */
  removedExercises: RemovedExercise[];
  onRestore: (entry: RemovedExercise) => void;
  onExpire: (entry: RemovedExercise) => void;
}

/**
 * Pasek cofnięcia (snackbar).
 *
 * Pokazuje ostatnie usunięcie i pozwala je cofnąć. Po cofnięciu na ekranie
 * pojawia się kolejny wpis z kolejki — nic nie ginie.
 *
 * Pasek siedzi NAD dolną nawigacją na telefonie (inaczej zasłaniałby dock)
 * i jest czytany przez czytniki ekranowe (role="status" + aria-live).
 */
export function UndoRemoveBar({ removedExercises, onRestore, onExpire }: UndoRemoveBarProps) {
  const current = removedExercises[removedExercises.length - 1] ?? null;
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(UNDO_WINDOW_MS / 1000));

  useEffect(() => {
    if (!current) return;

    setSecondsLeft(Math.ceil(UNDO_WINDOW_MS / 1000));
    const started = Date.now();

    const tick = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((UNDO_WINDOW_MS - (Date.now() - started)) / 1000));
      setSecondsLeft(left);
      if (left === 0) window.clearInterval(tick);
    }, 250);

    const hard = window.setTimeout(() => onExpire(current), UNDO_WINDOW_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(hard);
    };
  }, [current, onExpire]);

  if (!current) return null;

  // Nazwa dnia bierzemy z numeru w tygodniu — działa też wtedy, gdy user
  // jest w innym tygodniu niż ten, z którego usunięto ćwiczenie.
  const dayIndex = Number(current.dayId.split('-day-')[1]);
  const dayName = (Number.isFinite(dayIndex) && DAY_NAMES[dayIndex]) || 'ten dzień';
  const isReset = current.kind === 'weekReset';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[104px] md:bottom-6 w-[calc(100%-2rem)] max-w-sm"
    >
      <div
        key={current.timestamp}
        className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-[#1a1030]/95 backdrop-blur-xl shadow-2xl animate-fade-up"
      >
        {/* Pasek odliczający czas na cofnięcie */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-400/15">
          <div
            className="h-full bg-violet-400 origin-left"
            style={{ animation: `undo-shrink ${UNDO_WINDOW_MS}ms linear forwards` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {isReset ? (
                'Zresetowano plan tygodnia'
              ) : (
                <>
                  Usunięto <span className="font-bold">{current.exercise.name}</span>
                </>
              )}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {isReset
                ? 'Zmiany można cofnąć'
                : `z ${dayName} · cofnięcie za ${secondsLeft} s`}
            </p>
          </div>

          <button
            onClick={() => onRestore(current)}
            className="flex-shrink-0 min-h-[40px] px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Przywróć
          </button>
        </div>
      </div>
    </div>
  );
}

interface WorkoutPlannerProps {
  days: WorkoutDay[];
  weekMeta: WeekMeta;
  onToggleRest: (dayId: string) => void;
  onAddExercise: (dayId: string, exercise: Exercise) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  onUpdateExercise: (dayId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  onReplaceExercise: (dayId: string, exerciseId: string, newExercise: Exercise) => void;
  onMoveExercise: (dayId: string, exerciseId: string, direction: 'up' | 'down') => void;
  onMoveExerciseToDay?: (sourceDayId: string, exerciseId: string, targetDayId: string) => void;
  onMoveAllExercisesToDate?: (sourceDayId: string, targetDateStr: string) => void | Promise<unknown>;
  onResetWeek: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onGoToCurrentWeek: () => void;
  userId?: string;
  onCopyWorkout?: (
    sourceExercises: Exercise[],
    targetDateStr: string
  ) => Promise<{ error: Error | null }> | void;
  customExercises?: Exercise[];
  /** Pełna biblioteka ćwiczeń — dla okna tworzenia szablonu. */
  availableExercises?: Exercise[];
  onSaveCustomExercise?: (exercise: Exercise) => void;
  onDeleteCustomExercise?: (id: string) => void;
  highlightDayIndex?: number | null;
  /** Czy udostępnianie jest dostępne (Supabase + realne konto). */
  canShare?: boolean;
  /** E-mail zalogowanego użytkownika — nie może udostępnić samemu sobie. */
  currentUserEmail?: string | null;
  /** Ostatni odbiorcy udostępnień — podpowiedzi w oknie wysyłki. */
  recentRecipients?: string[];
  /** Wysyłka udostępnienia dnia — zwraca błąd albo `null` przy sukcesie. */
  onSendShare?: (
    recipientEmail: string,
    day: WorkoutDay,
    weekKey: string
  ) => Promise<{ error: Error | null }>;
  /** Szablony treningów do wyboru w DayColumn. */
  templates?: WorkoutTemplate[];
  /** Callback: zastosuj szablon do dnia. */
  onApplyTemplate?: (template: WorkoutTemplate, exercises: Exercise[], mode: 'append' | 'replace', dayId: string) => void;
  /** Callback: utwórz szablon z ćwiczeń dnia. */
  onCreateTemplateFromDay?: (day: WorkoutDay, templateData: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
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
  onMoveExerciseToDay,
  onMoveAllExercisesToDate,
  onResetWeek,
  onPrevWeek,
  onNextWeek,
  onGoToCurrentWeek,
  userId,
  onCopyWorkout,
  customExercises = [],
  availableExercises,
  onSaveCustomExercise,
  onDeleteCustomExercise,
  highlightDayIndex,
  canShare,
  currentUserEmail,
  recentRecipients,
  onSendShare,
  templates = [],
  onApplyTemplate,
  onCreateTemplateFromDay,
}: WorkoutPlannerProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const modalRef = useRef(modal);
  modalRef.current = modal;

  const daysRef = useRef(days);
  daysRef.current = days;

  const dayRefs = useRef<(Array<HTMLDivElement | null>)>(new Array(7).fill(null));

  // Przewiń do wybranego dnia po przejściu z dashboardu
  useEffect(() => {
    if (highlightDayIndex == null || highlightDayIndex < 0 || highlightDayIndex >= 7) return;

    // Funkcja przewijająca z ponawianiem w razie potrzeby
    const scrollToDay = (attempt = 0) => {
      const dayElement = dayRefs.current[highlightDayIndex];
      if (dayElement) {
        dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Dodaj tymczasowe podświetlenie
        dayElement.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
        setTimeout(() => {
          dayElement.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
        }, 2000);
      } else if (attempt < 10) {
        // Spróbuj ponownie za chwilę (element może jeszcze nie być zamontowany)
        setTimeout(() => scrollToDay(attempt + 1), 100);
      }
    };

    // Opóźnij przewinięcie żeby DOM się ustabilizował
    const timer = setTimeout(() => scrollToDay(), 100);
    return () => clearTimeout(timer);
  }, [highlightDayIndex]);

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
              <p className="text-xs text-red-500 mt-0.5">Wszystkie ćwiczenia i dane serii zostaną usunięte. Możesz to cofnąć paskiem na dole ekranu.</p>
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
        onOpenCopy={() => setCopyModalOpen(true)}
        trainingDays={trainingDays}
        restDays={restDays}
        totalExercises={totalExercises}
      />

      {/* Days list */}
      <div className="space-y-2">
        {days.map((day, index) => (
          <div
            key={day.id}
            ref={el => { dayRefs.current[index] = el; }}
          >
            <DayColumn
              day={day}
              index={index}
              onToggleRest={() => onToggleRest(day.id)}
              onRemoveExercise={(exId) => onRemoveExercise(day.id, exId)}
              onUpdateExercise={(exId, updates) => onUpdateExercise(day.id, exId, updates)}
              onMoveExercise={(exId, dir) => onMoveExercise(day.id, exId, dir)}
              onMoveExerciseToDay={onMoveExerciseToDay}
              onMoveAllExercisesToDate={onMoveAllExercisesToDate}
              days={days}
              onRequestAdd={() => handleRequestAdd(day.id, day.name)}
              onRequestReplace={(exercise) => handleRequestReplace(day.id, exercise)}
              canShare={canShare}
              currentUserEmail={currentUserEmail}
        recentRecipients={recentRecipients}
              weekKey={weekMeta.key}
              onSendShare={onSendShare}
              templates={templates}
              onApplyTemplate={onApplyTemplate}
              onCreateTemplateFromDay={onCreateTemplateFromDay}
              availableExercises={availableExercises}
            />
          </div>
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

      {copyModalOpen && (
        <CopyWorkoutModal
          userId={userId}
          onCopy={async (sourceExercises, targetDateStr) => {
            const result = await onCopyWorkout?.(sourceExercises, targetDateStr);
            // Błąd zapisu zostawia modal otwarty — komunikat pokazuje CopyWorkoutModal.
            if (result && result.error) throw result.error;
            setCopyModalOpen(false);
          }}
          onClose={() => setCopyModalOpen(false)}
        />
      )}
    </div>
  );
}
