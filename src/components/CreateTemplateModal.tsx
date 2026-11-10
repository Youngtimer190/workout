import { useState, useEffect } from 'react';
import { WorkoutTemplate, Exercise } from '../types';
import { TEMPLATE_COLORS, TEMPLATE_CATEGORIES } from '../types';
import { muscleGroupColors } from '../data/exercises';
import { CheckIcon, ClipboardIcon, DumbbellIcon, MuscleIcon, RepeatIcon, TimerIcon } from './icons';

interface CreateTemplateModalProps {
  onSave: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  editTemplate?: WorkoutTemplate | null;
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
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-violet-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all
          ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ExerciseChip({
  exercise,
  onRemove,
  onEdit,
}: { exercise: Exercise; onRemove: () => void; onEdit?: () => void }) {
  const isCardio = exercise.muscleGroup === 'Cardio';
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Top row: Emoji + Name (full width) */}
      <div className="flex items-center gap-2 pr-14 relative">
        <MuscleIcon group={exercise.muscleGroup} className="h-6 w-6 flex-shrink-0 text-slate-400" />
        <p className="text-base font-bold text-slate-800 truncate">{exercise.name}</p>

        {/* Actions - absolute positioned top-right, stacked vertically */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
              aria-label="Edytuj ćwiczenie w szablonie"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            aria-label="Usuń ćwiczenie z szablonu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom row: Details */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="font-medium text-slate-600">{exercise.muscleGroup}</span>
          {exercise.requiredEquipment?.length && (
            <>
              <span className="text-slate-300">·</span>
              <span>{exercise.requiredEquipment.map(e => e).join(', ')}</span>
            </>
          )}
        </span>
        {!isCardio ? (
          <span className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap inline-flex items-center gap-1"><RepeatIcon className="h-3 w-3" />{exercise.sets}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap inline-flex items-center gap-1"><DumbbellIcon className="h-3 w-3" />{exercise.reps}</span>
          </span>
        ) : (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 whitespace-nowrap inline-flex items-center gap-1"><TimerIcon className="h-3 w-3" />{exercise.duration} min</span>
        )}
      </div>
    </div>
  );
}

export default function CreateTemplateModal({
  onSave,
  onClose,
  editTemplate,
  availableExercises,
}: CreateTemplateModalProps) {
  const isEdit = !!editTemplate;

  const [form, setForm] = useState({
    name: editTemplate?.name ?? '',
    description: editTemplate?.description ?? '',
    color: editTemplate?.color ?? TEMPLATE_COLORS[0],
    category: editTemplate?.category ?? 'Custom',
    exercises: editTemplate?.exercises.map(e => ({ ...e })) ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Wszystkie');

  useEffect(() => {
    if (editTemplate) {
      setForm({
        name: editTemplate.name,
        description: editTemplate.description,
        color: editTemplate.color ?? TEMPLATE_COLORS[0],
        category: editTemplate.category ?? 'Custom',
        exercises: editTemplate.exercises.map(e => ({ ...e })),
      });
      setEditingExerciseIndex(null);
    }
  }, [editTemplate]);

  const groups = ['Wszystkie', ...Array.from(new Set(availableExercises.map(e => e.muscleGroup)))];
  const filteredExercises = availableExercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = selectedGroup === 'Wszystkie' || e.muscleGroup === selectedGroup;
    const matchCat = true; // All exercises shown (no category property on Exercise)
    return matchSearch && matchGroup && matchCat;
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Nazwa szablonu jest wymagana';
    if (form.exercises.length === 0) newErrors.exercises = 'Dodaj przynajmniej jedno ćwiczenie';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddExercise = (exercise: Exercise) => {
    // Usuń setLogs i id – szablon ma czyste ćwiczenia
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

  // Render body content - extracted to avoid ternary parsing issues in JSX
  const renderBody = () => {
    if (!showExercisePicker) {
      return (
        <div>
          {/* Name & Description */}
          <InputField label="Nazwa szablonu" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="np. Push A – Klatka/Barki/Triceps" required error={errors.name} />
          <div className="mt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Opis</label>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opisz cel lub strukturę treningu..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all" />
          </div>

          {/* Color picker */}
          <div className="mt-2 mb-6">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Kolor</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-xl border-2 transition-all cursor-pointer ${form.color === c ? 'border-white shadow-lg scale-110 ring-2 ring-offset-2' : 'border-slate-200 hover:border-slate-300'} ${c}`} aria-label={c} />
              ))}
            </div>
          </div>

          {/* Category picker */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${form.category === cat ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>
              ))}
            </div>
          </div>

          {/* Exercises list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700">Ćwiczenia w szablonie ({form.exercises.length})</h3>
              <button onClick={() => { setEditingExerciseIndex(null); setShowExercisePicker(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
                Dodaj
              </button>
            </div>

            {errors.exercises && <p className="text-xs text-red-500 mb-3">{errors.exercises}</p>}

            {form.exercises.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10 text-violet-200"><ClipboardIcon className="h-7 w-7" /></div>
                <p className="text-slate-500 font-medium">Brak ćwiczeń w szablonie</p>
                <p className="text-slate-400 text-sm mt-1">Kliknij „Dodaj” aby wybrać ćwiczenia z biblioteki</p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.exercises.map((ex, idx) => (
                  <ExerciseChip key={ex.id} exercise={ex} onRemove={() => handleRemoveExercise(idx)} onEdit={() => handleEditExercise(idx)} />
                ))}
              </div>
            )}
          </div>

          {/* Preview stats */}
          {form.exercises.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Podsumowanie</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-2xl font-bold text-violet-600">{form.exercises.length}</p>
                  <p className="text-[10px] text-slate-500">Ćwiczeń</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-2xl font-bold text-emerald-600">{form.exercises.filter(e => e.muscleGroup !== 'Cardio').reduce((a, e) => a + (e.sets || 0), 0)}</p>
                  <p className="text-[10px] text-slate-500">Serii</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-100">
                  <p className="text-2xl font-bold text-amber-600">{form.exercises.filter(e => e.muscleGroup === 'Cardio').length}</p>
                  <p className="text-[10px] text-slate-500">Cardio</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Array.from(new Set(form.exercises.map(e => e.muscleGroup))).map(mg => (
                  <span key={mg} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-slate-100 text-slate-600'}`}>{mg}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Exercise Picker view
    if (availableExercises.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Wybierz ćwiczenie</h3>
            <button onClick={() => { setShowExercisePicker(false); setEditingExerciseIndex(null); }} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors cursor-pointer">Anuluj</button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-sm text-amber-800 font-medium">Brak dostępnych ćwiczeń</p>
            <p className="text-xs text-amber-600 mt-1">Dodaj najpierw ćwiczenia w zakładce „Ćwiczenia” lub utwórz własne</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Wybierz ćwiczenie</h3>
          <button onClick={() => { setShowExercisePicker(false); setEditingExerciseIndex(null); }} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium transition-colors cursor-pointer">Anuluj</button>
        </div>

        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input type="text" placeholder="Szukaj ćwiczenia..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {groups.map(g => (
            <button key={g} onClick={() => setSelectedGroup(g)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${selectedGroup === g ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{g}</button>
          ))}
        </div>

        {filteredExercises.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">Brak pasujących ćwiczeń</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredExercises.map(ex => (
              <button key={ex.id} onClick={() => handleAddExercise(ex)} className="w-full text-left bg-white rounded-xl border border-slate-100 p-3 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
                <MuscleIcon group={ex.muscleGroup} className="h-5 w-5 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{ex.name}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">{ex.muscleGroup} · {ex.difficulty}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Dodaj</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Build gradient class from color (e.g., 'bg-violet-500' → 'bg-gradient-to-r from-violet-500 to-violet-600')
  const colorBase = form.color.replace('bg-', '').replace('-500', '');
  const gradientClass = `bg-gradient-to-r from-${colorBase}-500 to-${colorBase}-600`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl overflow-hidden flex flex-col rounded-t-2xl"
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientClass} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
                  {isEdit ? 'Edytuj szablon' : 'Nowy szablon treningu'}
                </p>
                <h2 className="text-xl font-bold text-white truncate">{form.name || (isEdit ? editTemplate!.name : 'Nowy szablon')}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-white/80 text-sm capitalize">{form.category}</span>
                  <span className="text-white/40">·</span>
                  <span className="text-white/80 text-sm">{form.exercises.length} ćwiczeń</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0"
                title="Zamknij"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {renderBody()}

          {editingExerciseIndex !== null && !showExercisePicker && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <p className="text-sm text-amber-800">Edytujesz: <span className="font-semibold">{form.exercises[editingExerciseIndex].name}</span></p>
              <button onClick={() => setEditingExerciseIndex(null)} className="text-xs text-amber-600 hover:underline cursor-pointer">Anuluj edycję</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Anuluj</button>
          <button onClick={handleSave} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${gradientClass} text-white shadow-md hover:shadow-lg hover:scale-[1.01] cursor-pointer`}>
            <span className="inline-flex items-center gap-1.5"><CheckIcon className="h-4 w-4" />{isEdit ? 'Zapisz zmiany' : 'Utwórz szablon'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}