import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { WorkoutTemplate, Exercise, WorkoutDay, templateGradient } from '../types';
import { muscleGroupColors } from '../data/exercises';
import { CheckIcon, DumbbellIcon, MuscleIcon, RepeatIcon, TimerIcon } from './icons';
import { equipmentLabels, pluralExercise, pluralSet } from '../lib/format';

interface ApplyTemplateModalProps {
  template: WorkoutTemplate;
  /** Opcjonalnie: lista szablonów — pierwszy krok wyboru szablonu. */
  templates?: WorkoutTemplate[];
  days: WorkoutDay[];
  /** Jeśli podano — dzień jest już wybrany (krok wyboru dnia pomijamy). */
  preselectedDayId?: string;
  onApply: (exercises: Exercise[], mode: 'append' | 'replace', dayId: string, templateId: string) => void;
  onClose: () => void;
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const isCardio = exercise.muscleGroup === 'Cardio';
  const equipment = equipmentLabels(exercise.requiredEquipment);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
      <MuscleIcon group={exercise.muscleGroup} className="h-5 w-5 flex-shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{exercise.name}</p>
        <p className="truncate text-[11px] text-slate-400">
          {exercise.muscleGroup}
          {equipment ? ` · ${equipment}` : ''}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {isCardio ? (
          exercise.duration ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
              <TimerIcon className="h-3 w-3" />{exercise.duration} min
            </span>
          ) : null
        ) : (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              <RepeatIcon className="h-3 w-3" />{exercise.sets}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              <DumbbellIcon className="h-3 w-3" />{exercise.reps}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Okno „Zastosuj szablon".
 *
 * Jeden ekran: wybór dnia + tryb (dopisz / zastąp) + podsumowanie + lista
 * ćwiczeń. Wcześniej były trzy kroki, co przy jednym szablonie oznaczało
 * dwa zbędne kliknięcia.
 */
export default function ApplyTemplateModal({
  template,
  templates,
  days,
  preselectedDayId,
  onApply,
  onClose,
}: ApplyTemplateModalProps) {
  const allTemplates = templates && templates.length > 0 ? templates : [template];

  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate>(template);
  const [step, setStep] = useState<'pickTemplate' | 'apply'>(
    preselectedDayId || allTemplates.length <= 1 ? 'apply' : 'pickTemplate'
  );
  const [selectedDayId, setSelectedDayId] = useState<string>(preselectedDayId ?? '');
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape zamyka okno.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Blokada przewijania tła + fokus na oknie.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = '';
      cancelAnimationFrame(raf);
    };
  }, []);

  const exercises = selectedTemplate.exercises ?? [];
  const strength = exercises.filter(e => e.muscleGroup !== 'Cardio');
  const totalSets = strength.reduce((a, e) => a + (e.sets || 0), 0);
  const cardioCount = exercises.length - strength.length;
  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscleGroup)));
  const gradientClass = templateGradient(selectedTemplate.color);

  // Dni, do których można dodać szablon (dni odpoczynku tylko z ćwiczeniami).
  const availableDays = useMemo(
    () => days.filter(d => !d.isRestDay || d.exercises.length > 0),
    [days]
  );

  // Domyślnie pierwszy dzień z ćwiczeniami albo pierwszy wolny.
  useEffect(() => {
    if (selectedDayId) return;
    const withExercises = availableDays.find(d => d.exercises.length > 0);
    const fallback = withExercises ?? availableDays[0];
    if (fallback) setSelectedDayId(fallback.id);
  }, [availableDays, selectedDayId]);

  const selectedDay = days.find(d => d.id === selectedDayId);
  const willReplace = mode === 'replace' && (selectedDay?.exercises.length ?? 0) > 0;

  const handleConfirmApply = () => {
    if (!selectedDayId) return;
    const cleanExercises = exercises.map(ex => ({
      ...ex,
      id: `tmpl-${selectedTemplate.id}-${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      setLogs: ex.setLogs?.map(log => ({
        ...log,
        id: `set-${Date.now()}-${Math.random()}`,
        done: false,
        actualReps: null,
      })) ?? [],
    }));
    onApply(cleanExercises, mode, selectedDayId, selectedTemplate.id);
    onClose();
  };

  /* ── Krok 1: wybór szablonu (gdy jest ich kilka) ── */
  if (step === 'pickTemplate') {
    return (
      <div
        className="modal-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        onClick={onClose}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' } as CSSProperties}
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tpl-pick-title"
          onClick={(e) => e.stopPropagation()}
          className="modal-panel relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
        >
          <div className="flex shrink-0 items-start justify-between bg-gradient-to-r from-slate-700 to-slate-800 p-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">Zastosuj szablon</p>
              <h2 id="tpl-pick-title" className="text-xl font-bold text-white">Wybierz szablon</h2>
              <p className="mt-1.5 text-sm text-white/80">{allTemplates.length} dostępnych szablonów</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Zamknij"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-5">
            {allTemplates.map(t => {
              const tStrength = t.exercises.filter(e => e.muscleGroup !== 'Cardio');
              const tSets = tStrength.reduce((a, e) => a + (e.sets || 0), 0);
              const tCardio = t.exercises.length - tStrength.length;
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTemplate(t); setStep('apply'); }}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-xl border-2 border-white/[0.07] p-3 text-left transition-all hover:border-violet-400/40 hover:bg-white/[0.05]"
                >
                  <span className={`h-10 w-10 flex-shrink-0 rounded-xl ${templateGradient(t.color)}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{t.name}</span>
                    {t.description && <span className="mt-0.5 block truncate text-xs text-slate-400">{t.description}</span>}
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{t.exercises.length} {pluralExercise(t.exercises.length)}</span>
                      <span>·</span>
                      <span>{tSets} {pluralSet(tSets)}</span>
                      {tCardio > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-sky-300">{tCardio} cardio</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="shrink-0 border-t border-white/[0.07] px-5 py-4">
            <button
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] cursor-pointer"
            >
              Anuluj
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Krok 2: dzień + tryb + potwierdzenie ── */
  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' } as CSSProperties}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tpl-apply-title"
        onClick={(e) => e.stopPropagation()}
        className="modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        {/* Nagłówek */}
        <div className={`${gradientClass} flex shrink-0 items-start justify-between gap-4 p-5`}>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">Zastosuj szablon</p>
            <h2 id="tpl-apply-title" className="truncate text-xl font-bold text-white">{selectedTemplate.name}</h2>
            <p className="mt-1.5 text-sm text-white/80">
              {exercises.length} {pluralExercise(exercises.length)}
              {totalSets > 0 && <> · {totalSets} {pluralSet(totalSets)}</>}
              {cardioCount > 0 && <> · {cardioCount} cardio</>}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Treść */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Wybór dnia */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Do którego dnia dodać?</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {availableDays.map(day => {
                const selected = day.id === selectedDayId;
                const busy = day.exercises.length > 0;
                return (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayId(day.id)}
                    aria-pressed={selected}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-violet-400/60 bg-violet-500/15'
                        : 'border-white/[0.07] bg-white/[0.03] hover:border-violet-400/30 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${selected ? 'text-violet-100' : 'text-slate-200'}`}>
                      {day.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {busy ? `${day.exercises.length} ćw.` : 'Pusty'}
                    </span>
                  </button>
                );
              })}
              {availableDays.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-400">
                  W tym tygodniu nie ma dni, do których można dodać szablon.
                </p>
              )}
            </div>
          </div>

          {/* Tryb */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Co zrobić z tym dniem?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('append')}
                aria-pressed={mode === 'append'}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer ${
                  mode === 'append'
                    ? 'border-violet-400/60 bg-violet-500/15'
                    : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <span className={`block text-sm font-semibold ${mode === 'append' ? 'text-violet-100' : 'text-slate-200'}`}>
                  Dopisz
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Ćwiczenia dojdą do istniejących
                </span>
              </button>
              <button
                onClick={() => setMode('replace')}
                aria-pressed={mode === 'replace'}
                disabled={(selectedDay?.exercises.length ?? 0) === 0}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  mode === 'replace'
                    ? 'border-amber-400/60 bg-amber-400/15'
                    : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <span className={`block text-sm font-semibold ${mode === 'replace' ? 'text-amber-100' : 'text-slate-200'}`}>
                  Zastąp dzień
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Usuń stare ćwiczenia i wstaw szablon
                </span>
              </button>
            </div>
          </div>

          {/* Ćwiczenia */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Co dodamy ({exercises.length})
            </p>
            <div className="space-y-1.5">
              {exercises.map((ex, i) => (
                <ExerciseRow key={`${ex.id}-${i}`} exercise={ex} />
              ))}
            </div>
            {muscleGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {muscleGroups.map(mg => (
                  <span
                    key={mg}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${muscleGroupColors[mg] || 'bg-white/[0.06] text-slate-300'}`}
                  >
                    {mg}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stopka */}
        <div
          className="shrink-0 border-t border-white/[0.07] px-5 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <p className="mb-2.5 text-center text-[11px] text-slate-400">
            {selectedDay ? (
              <>
                {exercises.length} {pluralExercise(exercises.length)} → <span className="font-semibold text-slate-200">{selectedDay.name}</span>
                {willReplace && (
                  <span className="text-amber-300"> · zastaniemy {selectedDay?.exercises.length} ćwiczeń tego dnia</span>
                )}
              </>
            ) : (
              'Wybierz dzień'
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] cursor-pointer"
            >
              Anuluj
            </button>
            <button
              onClick={handleConfirmApply}
              disabled={!selectedDayId}
              className={`${gradientClass} min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4" />
                Dodaj do planu
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
