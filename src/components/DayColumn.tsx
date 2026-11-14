import { useState, useEffect, memo } from 'react';
import { WorkoutDay, Exercise, WorkoutTemplate } from '../types';
import ExerciseCard from './ExerciseCard';
import MoveExerciseModal from './MoveExerciseModal';
import MoveDayModal from './MoveDayModal';
import ShareWorkoutModal from './ShareWorkoutModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import CreateTemplateModal from './CreateTemplateModal';
import { BookIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, DumbbellIcon, MoonIcon, ShareIcon } from './icons';
import { resolveDayColor } from '../data/exercises';

interface DayColumnProps {
  day: WorkoutDay;
  index: number;
  onToggleRest: () => void;
  onRemoveExercise: (exerciseId: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onMoveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  onMoveExerciseToDay?: (sourceDayId: string, exerciseId: string, targetDayId: string) => void;
  onMoveAllExercisesToDate?: (sourceDayId: string, targetDateStr: string) => void | Promise<unknown>;
  days?: WorkoutDay[];
  onRequestAdd: () => void;
  onRequestReplace: (exercise: Exercise) => void;
  /** Czy udostępnianie jest dostępne (Supabase + realne konto). */
  canShare?: boolean;
  /** E-mail zalogowanego użytkownika — nie może udostępnić samemu sobie. */
  currentUserEmail?: string | null;
  /** Ostatni odbiorcy udostępnień — podpowiedzi w oknie wysyłki. */
  recentRecipients?: string[];
  /** Klucz tygodnia, do którego należy dzień (np. „2025-W03"). */
  weekKey?: string;
  /** Wysyłka udostępnienia — zwraca błąd albo `null` przy sukcesie. */
  onSendShare?: (
    recipientEmail: string,
    day: WorkoutDay,
    weekKey: string
  ) => Promise<{ error: Error | null }>;
  /** Szablony treningów do wyboru. */
  templates?: WorkoutTemplate[];
  /** Callback: zastosuj szablon do tego dnia. */
  onApplyTemplate?: (template: WorkoutTemplate, exercises: Exercise[], mode: 'append' | 'replace', dayId: string) => void;
  /** Callback: utwórz szablon z ćwiczeń tego dnia. */
  onCreateTemplateFromDay?: (day: WorkoutDay, templateData: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  /** Biblioteka ćwiczeń — dla okna tworzenia szablonu. */
  availableExercises?: Exercise[];
}

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

function DayColumn({
  day,
  index,
  onToggleRest,
  onRemoveExercise,
  onUpdateExercise,
  onMoveExercise,
  onMoveExerciseToDay,
  onMoveAllExercisesToDate,
  days,
  onRequestAdd,
  onRequestReplace,
  canShare,
  currentUserEmail,
  recentRecipients,
  weekKey,
  onSendShare,
  templates = [],
  onApplyTemplate,
  onCreateTemplateFromDay,
  availableExercises,
}: DayColumnProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moveExerciseState, setMoveExerciseState] = useState<{ exercise: Exercise; sourceDayId: string } | null>(null);
  const [moveDayModalOpen, setMoveDayModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [restConfirmOpen, setRestConfirmOpen] = useState(false);
  const [applyTemplateModal, setApplyTemplateModal] = useState<{ template: WorkoutTemplate } | null>(null);
  const [createTemplateModalOpen, setCreateTemplateModalOpen] = useState(false);

  // Ustawienie dnia odpoczynku KASUJE jego ćwiczenia (toggleRestDay zeruje
  // tablicę ćwiczeń) — operacji nie da się cofnąć. Dlatego przy przełączniku
  // pytamy o potwierdzenie. Pytamy tylko wtedy, gdy jest co stracić: dzień
  // bez ćwiczeń przełączamy bez pytania, a powrót z odpoczynku na trening
  // niczego nie kasuje.
  const requestToggleRest = () => {
    if (!day.isRestDay && day.exercises.length > 0) {
      setRestConfirmOpen(true);
      return;
    }
    onToggleRest();
  };

  const confirmToggleRest = () => {
    setRestConfirmOpen(false);
    onToggleRest();
  };

  // Escape anuluje potwierdzenie. Pomijamy, gdy w karcie otwarty jest inny
  // modal — własne Escape tamtego modalu i tak nasłuchuje.
  useEffect(() => {
    if (!restConfirmOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (moveDayModalOpen || shareModalOpen || moveExerciseState) return;
      setRestConfirmOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [restConfirmOpen, moveDayModalOpen, shareModalOpen, moveExerciseState]);

  // Cardio nie ma serii — liczymy tylko serie ćwiczeń siłowych.
  const totalSets = day.exercises.reduce(
    (acc, e) => acc + (e.muscleGroup === 'Cardio' ? 0 : (e.sets || 0)),
    0
  );
  // Minuty cardio — informacja zamiast „serii” w nagłówku dnia.
  const cardioMinutes = day.exercises.reduce(
    (acc, e) => acc + (e.muscleGroup === 'Cardio' ? (e.duration || 0) : 0),
    0
  );
  const completedExercises = day.exercises.filter(e =>
    e.setLogs && e.setLogs.length > 0 && e.setLogs.every(s => s.done)
  ).length;
  const shortLabel = DAY_LABELS[index] ?? '';

  // Klucz tygodnia: z propa, a w razie jego braku z identyfikatora dnia
  // (format `${weekKey}-day-${index}`).
  const resolvedWeekKey = weekKey ?? day.id.split('-day-')[0] ?? '';
  const canShareDay = !!canShare && !!onSendShare && !day.isRestDay && day.exercises.length > 0;

  const handleMoveExercise = (targetDayId: string) => {
    if (moveExerciseState && onMoveExerciseToDay) {
      onMoveExerciseToDay(moveExerciseState.sourceDayId, moveExerciseState.exercise.id, targetDayId);
      setMoveExerciseState(null);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
      day.isRestDay ? 'border-slate-100 opacity-80' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
    }`}>

      {/* Header - Two rows: info + actions */}
      <div
        className={`bg-gradient-to-r ${resolveDayColor(day.color)} cursor-pointer select-none`}
        onClick={() => setCollapsed(prev => !prev)}
      >
        {/* Row 1: Day badge + info + progress */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Day badge */}
          <div className="w-10 h-10 rounded-xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm leading-tight">{shortLabel}</span>
          </div>

          {/* Day info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight truncate">{day.name}</p>
            {day.isRestDay ? (
              <p className="text-white/70 text-xs mt-0.5">Dzień odpoczynku</p>
            ) : day.exercises.length === 0 ? (
              <p className="text-white/70 text-xs mt-0.5">Brak ćwiczeń – kliknij aby dodać</p>
            ) : (
              <p className="text-white/70 text-xs mt-0.5">
                {day.exercises.length} ćw.
                {totalSets > 0 && ` · ${totalSets} serii`}
                {cardioMinutes > 0 && ` · ${cardioMinutes} min cardio`}
                {completedExercises > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span>·</span>
                    <CheckIcon className="h-3 w-3" />
                    <span>{completedExercises}/{day.exercises.length}</span>
                  </span>
                )}
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

          {/* Collapse chevron */}
          <div className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${collapsed ? 'rotate-180' : ''} flex-shrink-0`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Row 2: Actions bar - only on training days */}
        {!day.isRestDay && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 justify-center">
              {/* Primary actions */}
              <button
                onClick={e => { e.stopPropagation(); requestToggleRest(); }}
                title="Ustaw jako dzień odpoczynku"
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              </button>

              <button
                onClick={e => { e.stopPropagation(); onRequestAdd(); }}
                title="Dodaj ćwiczenie"
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              {/* Visual separator */}
              {(day.exercises.length > 0 || canShareDay || (templates.length > 0 && onApplyTemplate)) && (
                <div className="w-px h-5 bg-white/20 mx-1" aria-hidden="true" />
              )}

              {/* Secondary actions */}
              {day.exercises.length > 0 && onMoveAllExercisesToDate && (
                <button
                  onClick={e => { e.stopPropagation(); setMoveDayModalOpen(true); }}
                  title="Przenieś trening na inny dzień"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {canShareDay && (
                <button
                  onClick={e => { e.stopPropagation(); setShareModalOpen(true); }}
                  title="Udostępnij trening"
                  aria-label="Udostępnij trening"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              )}

              {templates.length > 0 && onApplyTemplate && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setApplyTemplateModal({ template: templates[0] });
                  }}
                  title="Zastosuj szablon treningu"
                  aria-label="Zastosuj szablon treningu"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </button>
              )}

              {/* Save as template - only when day has exercises */}
              {!day.isRestDay && day.exercises.length > 0 && onCreateTemplateFromDay && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setCreateTemplateModalOpen(true);
                  }}
                  title="Zapisz jako szablon"
                  aria-label="Zapisz trening jako szablon"
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-white">
                    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 12v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V12" />
                    <path d="M3 12h18" />
                    <path d="M17 8v1" />
                    <path d="M7 8v1" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Potwierdzenie: ustawienie dnia odpoczynku kasuje ćwiczenia ── */}
      {restConfirmOpen && !day.isRestDay && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-in">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="min-w-0">
              <p className="text-xs text-red-700 font-bold">
                Ustawić {day.name} jako dzień odpoczynku?
              </p>
              <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">
                {day.exercises.length === 1
                  ? 'Zostanie usunięte 1 ćwiczenie wraz z danymi serii.'
                  : `Zostaną usunięte wszystkie ${day.exercises.length} ${
                      day.exercises.length < 5 ? 'ćwiczenia' : 'ćwiczeń'
                    } wraz z danymi serii.`}{' '}
                Tej operacji nie można cofnąć.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRestConfirmOpen(false)}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-semibold border border-slate-200 active:bg-slate-50 transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              onClick={confirmToggleRest}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold active:bg-red-600 transition-colors cursor-pointer shadow-sm"
            >
              Tak, ustaw
            </button>
          </div>
        </div>
      )}

      {/* Collapsible body */}
      {!collapsed && (
        <div className="p-3 sm:p-4">
          {day.isRestDay ? (
            <div className="flex items-center justify-between py-2 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-200">
                  <MoonIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-slate-600 font-semibold text-sm">Dzień odpoczynku</p>
                  <p className="text-slate-400 text-xs mt-0.5 hidden sm-block">Regeneracja mięśni jest kluczowa dla postępów</p>
                </div>
              </div>
              <button
                onClick={requestToggleRest}
                className="text-xs text-cyan-500 hover:text-cyan-700 font-semibold underline underline-offset-2 transition-colors cursor-pointer flex-shrink-0"
              >
                Zamień na trening
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {day.exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-200">
                    <DumbbellIcon className="h-7 w-7" />
                  </span>
                  <p className="text-slate-500 font-semibold text-lg">Brak ćwiczeń</p>
                  <p className="text-slate-400 text-sm mt-1">Dodaj pierwsze ćwiczenie do tego dnia</p>
                </div>
              ) : (
                <>
                  {day.exercises.length > 1 && (
                    <p className="text-center text-[11px] text-slate-400 pb-0.5 flex items-center justify-center gap-1">
                      Użyj przycisków
                      <ChevronUpIcon className="h-3 w-3" />
                      <ChevronDownIcon className="h-3 w-3" />
                      aby zmienić kolejność ćwiczeń
                    </p>
                  )}
                  <div className="space-y-2">
                    {day.exercises.map((exercise, exIndex) => (
                      <div key={exercise.id} className="flex gap-2 items-stretch">

                        {/* Order buttons — always visible, large touch targets */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {day.exercises.length > 1 && (
                            <>
                              <button
                                onClick={() => onMoveExercise(exercise.id, 'up')}
                                disabled={exIndex === 0}
                                className={`flex-1 w-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  exIndex === 0
                                    ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                                    : 'bg-slate-100 hover:bg-cyan-100 active:bg-cyan-200 text-slate-400 hover:text-cyan-600'
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
                                    : 'bg-slate-100 hover:bg-cyan-100 active:bg-cyan-200 text-slate-400 hover:text-cyan-600'
                                }`}
                                title="Przesuń niżej"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </button>
                            </>
                          )}
                          {/* Move to another day button */}
                          <button
                            onClick={() => setMoveExerciseState({ exercise, sourceDayId: day.id })}
                            className="flex-1 w-9 rounded-lg bg-slate-100 hover:bg-emerald-100 active:bg-emerald-200 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-all cursor-pointer"
                            title="Przenieś na inny dzień"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

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
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-cyan-300 hover:text-cyan-500 hover:bg-cyan-50/50 active:bg-cyan-100/50 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Dodaj ćwiczenie
              </button>

              {/* Udostępnij — widoczny przycisk z etykietą (ikona w nagłówku
                  jest mała i łatwo ją przeoczyć, szczególnie na telefonie). */}
              {canShareDay && (
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/20 active:bg-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShareIcon className="h-4 w-4" />
                  Udostępnij ten trening
                </button>
              )}

              {/* Zapisz jako szablon — widoczny przycisk z etykietą (ikona
                  w nagłówku dnia jest mała i łatwo ją przeoczyć). */}
              {onCreateTemplateFromDay && (
                <button
                  onClick={() => setCreateTemplateModalOpen(true)}
                  className="mt-2 w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-400/35 hover:bg-white/[0.07] active:bg-white/[0.1] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookIcon className="h-4 w-4" />
                  Zapisz jako szablon
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Move Exercise Modal */}
      {moveExerciseState && days && (
        <MoveExerciseModal
          exercise={moveExerciseState.exercise}
          sourceDay={day}
          days={days}
          onMove={(targetDayId) => handleMoveExercise(targetDayId)}
          onClose={() => setMoveExerciseState(null)}
        />
      )}

      {/* Move Day Modal */}
      {moveDayModalOpen && (
        <MoveDayModal
          sourceDay={day}
          onMove={(targetDateStr) => {
            onMoveAllExercisesToDate?.(day.id, targetDateStr);
            setMoveDayModalOpen(false);
          }}
          onClose={() => setMoveDayModalOpen(false)}
        />
      )}

      {/* Share Workout Modal */}
      {shareModalOpen && canShareDay && (
        <ShareWorkoutModal
          day={day}
          weekKey={resolvedWeekKey}
          currentUserEmail={currentUserEmail}
          recentRecipients={recentRecipients}
          onSend={(recipientEmail) => onSendShare!(recipientEmail, day, resolvedWeekKey)}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Apply Template Modal */}
      {applyTemplateModal && onApplyTemplate && days && (
        <ApplyTemplateModal
          template={applyTemplateModal.template}
          templates={templates}
          days={days}
          preselectedDayId={day.id}
          onApply={(exercises, mode) => onApplyTemplate(applyTemplateModal.template, exercises, mode, day.id)}
          onClose={() => setApplyTemplateModal(null)}
        />
      )}

      {/* Create Template Modal */}
      {createTemplateModalOpen && onCreateTemplateFromDay && (
        <CreateTemplateModal
          onSave={(templateData) => {
            onCreateTemplateFromDay(day, templateData);
            setCreateTemplateModalOpen(false);
          }}
          onClose={() => setCreateTemplateModalOpen(false)}
          initialExercises={day.exercises}
          availableExercises={availableExercises ?? []}
        />
      )}
    </div>
  );
}

export default memo(DayColumn);