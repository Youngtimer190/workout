import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { WorkoutTemplate, Exercise, TEMPLATE_CATEGORY_DEFAULT, TEMPLATE_CATEGORY_GROUPS, TEMPLATE_COLOR_LABELS, templateGradient } from '../types';
import { muscleGroupColors } from '../data/exercises';
import { CheckIcon, ClipboardIcon, DumbbellIcon, MuscleIcon, RepeatIcon, TimerIcon } from './icons';
import { equipmentLabels, pluralExercise, pluralSet } from '../lib/format';

interface CreateTemplateModalProps {
  onSave: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  /** Edycja istniejącego szablonu. */
  editTemplate?: WorkoutTemplate | null;
  /** Nowy szablon tworzony z dnia w Planerze — ćwiczenia są już wybrane. */
  initialExercises?: Exercise[];
  availableExercises: Exercise[];
}

function InputField({
  label, value, onChange, placeholder, type = 'text', required, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label} {required && <span className="text-cyan-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/30 ${
          error ? 'border-red-400/50 bg-red-500/10' : 'border-white/10 focus:border-cyan-400/50'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}

function ExerciseChip({
  exercise,
  onRemove,
  onEdit,
}: { exercise: Exercise; onRemove: () => void; onEdit?: () => void }) {
  const isCardio = exercise.muscleGroup === 'Cardio';
  const equipment = equipmentLabels(exercise.requiredEquipment);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 pr-16">
        <MuscleIcon group={exercise.muscleGroup} className="h-5 w-5 flex-shrink-0 text-slate-400" />
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{exercise.name}</p>

        <div className="flex flex-shrink-0 items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-cyan-300 cursor-pointer"
              aria-label={`Edytuj ${exercise.name} w szablonie`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={onRemove}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 cursor-pointer"
            aria-label={`Usuń ${exercise.name} z szablonu`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1.5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:gap-2">
        <span className="font-medium text-slate-300">{exercise.muscleGroup}</span>
        {equipment && (
          <>
            <span className="text-slate-600">·</span>
            <span className="truncate">{equipment}</span>
          </>
        )}
        <span className="sm:ml-auto flex items-center gap-1.5">
          {isCardio ? (
            exercise.duration ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-200">
                <TimerIcon className="h-3 w-3" />{exercise.duration} min
              </span>
            ) : null
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 font-semibold text-slate-300">
                <RepeatIcon className="h-3 w-3" />{exercise.sets}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 font-semibold text-slate-300">
                <DumbbellIcon className="h-3 w-3" />{exercise.reps}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function CreateTemplateModal({
  onSave,
  onClose,
  editTemplate,
  initialExercises,
  availableExercises,
}: CreateTemplateModalProps) {
  const isEdit = !!editTemplate;

  const [form, setForm] = useState({
    name: editTemplate?.name ?? '',
    description: editTemplate?.description ?? '',
    color: editTemplate?.color ?? 'bg-cyan-500',
    category: editTemplate?.category ?? TEMPLATE_CATEGORY_DEFAULT,
    exercises: (editTemplate?.exercises ?? initialExercises ?? []).map(e => ({ ...e })),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Wszystkie');

  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape zamyka okno.
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Blokada przewijania tła + fokus na pierwszym polu.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = '';
      cancelAnimationFrame(raf);
    };
  }, []);

  const groups = ['Wszystkie', ...Array.from(new Set(availableExercises.map(e => e.muscleGroup)))];

  const filteredExercises = availableExercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === 'Wszystkie' || e.muscleGroup === selectedGroup;
    return matchSearch && matchGroup;
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Nazwa szablonu jest wymagana';
    if (form.exercises.length === 0) newErrors.exercises = 'Dodaj przynajmniej jedno ćwiczenie';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddExercise = (exercise: Exercise) => {
    // Szablon ma czyste ćwiczenia — bez id i bez stanu serii.
    const cleanExercise: Exercise = {
      id: `tmpl-ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      difficulty: exercise.difficulty,
      description: exercise.description,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      duration: exercise.duration,
      restTime: exercise.restTime,
      notes: exercise.notes,
      requiredEquipment: exercise.requiredEquipment,
      isUnilateral: exercise.isUnilateral,
    };

    if (editingExerciseIndex !== null) {
      setForm(f => {
        const next = [...f.exercises];
        next[editingExerciseIndex] = cleanExercise;
        return { ...f, exercises: next };
      });
      setEditingExerciseIndex(null);
    } else {
      setForm(f => ({ ...f, exercises: [...f.exercises, cleanExercise] }));
    }
    setShowExercisePicker(false);
    setSearch('');
  };

  const handleRemoveExercise = (index: number) => {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== index) }));
  };

  const handleEditExercise = (index: number) => {
    setEditingExerciseIndex(index);
    setShowExercisePicker(true);
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      color: form.color,
      category: form.category,
      exercises: form.exercises,
    });
  };

  const gradientClass = templateGradient(form.color);
  const strengthSets = form.exercises.filter(e => e.muscleGroup !== 'Cardio').reduce((a, e) => a + (e.sets || 0), 0);
  const cardioCount = form.exercises.filter(e => e.muscleGroup === 'Cardio').length;
  const muscleGroups = Array.from(new Set(form.exercises.map(e => e.muscleGroup)));

  const renderBody = () => {
    if (!showExercisePicker) {
      return (
        <div>
          <InputField
            label="Nazwa szablonu"
            value={form.name}
            onChange={v => setForm(f => ({ ...f, name: v }))}
            placeholder="np. Push A — klatka, barki, triceps"
            required
            error={errors.name}
          />

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400" htmlFor="tpl-description">
              Opis <span className="font-normal normal-case text-slate-500">(opcjonalnie)</span>
            </label>
            <textarea
              id="tpl-description"
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Cel, objętość, czas trwania…"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
            />
          </div>

          {/* Kolor */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Kolor</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TEMPLATE_COLOR_LABELS).map(([color, label]) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color }))}
                  aria-label={label}
                  aria-pressed={form.color === color}
                  title={label}
                  className={`h-7 w-7 rounded-xl border-2 transition-all cursor-pointer ${color} ${
                    form.color === color
                      ? 'border-white ring-2 ring-cyan-400/60 ring-offset-2 ring-offset-[#08132b] scale-110'
                      : 'border-white/20 hover:border-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Kategoria */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Kategoria</p>
            <div className="space-y-3">
              {TEMPLATE_CATEGORY_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat }))}
                        aria-pressed={form.category === cat}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                          form.category === cat
                            ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-100'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ćwiczenia */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Ćwiczenia w szablonie ({form.exercises.length})
              </h3>
              <button
                onClick={() => { setEditingExerciseIndex(null); setShowExercisePicker(true); }}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Dodaj
              </button>
            </div>

            {errors.exercises && <p className="mb-2 text-xs text-red-300">{errors.exercises}</p>}

            {form.exercises.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-white/10 px-4 py-8 text-center">
                <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-200">
                  <ClipboardIcon className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-slate-300">Brak ćwiczeń w szablonie</p>
                <p className="mt-1 text-xs text-slate-500">Kliknij „Dodaj”, aby wybrać ćwiczenia z biblioteki</p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.exercises.map((ex, idx) => (
                  <ExerciseChip
                    key={ex.id}
                    exercise={ex}
                    onRemove={() => handleRemoveExercise(idx)}
                    onEdit={() => handleEditExercise(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Podsumowanie */}
          {form.exercises.length > 0 && (
            <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Podsumowanie</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5">
                  <p className="text-xl font-bold text-cyan-300">{form.exercises.length}</p>
                  <p className="text-[10px] text-slate-500">{pluralExercise(form.exercises.length)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5">
                  <p className="text-xl font-bold text-emerald-300">{strengthSets}</p>
                  <p className="text-[10px] text-slate-500">{pluralSet(strengthSets)}</p>
                </div>
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5">
                  <p className="text-xl font-bold text-amber-300">{cardioCount}</p>
                  <p className="text-[10px] text-slate-500">cardio</p>
                </div>
              </div>
              {muscleGroups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {muscleGroups.map(mg => (
                    <span
                      key={mg}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-white/[0.06] text-slate-300'}`}
                    >
                      {mg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Wybór ćwiczeń
    if (availableExercises.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Wybierz ćwiczenie</h3>
            <button
              onClick={() => { setShowExercisePicker(false); setEditingExerciseIndex(null); }}
              className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1] cursor-pointer"
            >
              Anuluj
            </button>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-center">
            <p className="text-sm font-medium text-amber-200">Brak dostępnych ćwiczeń</p>
            <p className="mt-1 text-xs text-amber-200/80">
              Dodaj najpierw ćwiczenia w zakładce „Ćwiczenia” lub utwórz własne
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">
            {editingExerciseIndex !== null ? 'Wymień ćwiczenie' : 'Wybierz ćwiczenie'}
          </h3>
          <button
            onClick={() => { setShowExercisePicker(false); setEditingExerciseIndex(null); }}
            className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1] cursor-pointer"
          >
            Anuluj
          </button>
        </div>

        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Szukaj ćwiczenia…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Szukaj ćwiczenia"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              aria-pressed={selectedGroup === g}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                selectedGroup === g
                  ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {filteredExercises.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">Brak pasujących ćwiczeń</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredExercises.map(ex => (
              <button
                key={ex.id}
                onClick={() => handleAddExercise(ex)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-left transition-all hover:border-cyan-400/30 hover:bg-white/[0.06]"
              >
                <MuscleIcon group={ex.muscleGroup} className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{ex.name}</p>
                  <p className="text-xs text-slate-500">
                    {ex.muscleGroup}
                    {ex.difficulty ? ` · ${ex.difficulty}` : ''}
                  </p>
                </div>
                <span className="flex-shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                  Dodaj
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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
        aria-labelledby="tpl-create-title"
        onClick={(e) => e.stopPropagation()}
        className="modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl"
      >
        {/* Nagłówek */}
        <div className={`${gradientClass} flex shrink-0 items-start justify-between gap-4 p-5`}>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-white/70">
              {isEdit ? 'Edytuj szablon' : 'Nowy szablon treningu'}
            </p>
            <h2 id="tpl-create-title" className="truncate text-xl font-bold text-white">
              {form.name || (isEdit ? 'Szablon' : 'Bez nazwy')}
            </h2>
            <p className="mt-1.5 text-sm text-white/80">
              {form.category} · {form.exercises.length} {pluralExercise(form.exercises.length)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 cursor-pointer"
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Treść */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {renderBody()}

          {editingExerciseIndex !== null && !showExercisePicker && (
            <div className="flex items-center justify-between rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
              <p className="text-sm text-amber-200">
                Edytujesz: <span className="font-semibold">{form.exercises[editingExerciseIndex].name}</span>
              </p>
              <button
                onClick={() => setEditingExerciseIndex(null)}
                className="text-xs text-amber-300 underline cursor-pointer"
              >
                Anuluj edycję
              </button>
            </div>
          )}
        </div>

        {/* Stopka */}
        <div
          className="flex shrink-0 gap-3 border-t border-white/[0.07] px-5 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] cursor-pointer"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            className={`${gradientClass} min-h-[44px] flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 cursor-pointer`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4" />
              {isEdit ? 'Zapisz zmiany' : 'Utwórz szablon'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
