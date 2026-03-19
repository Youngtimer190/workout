import { useState } from 'react';
import { Exercise, MuscleGroup, Difficulty } from '../types';
import { muscleGroupColors } from '../data/exercises';

interface CreateExerciseModalProps {
  onSave: (exercise: Exercise) => void;
  onClose: () => void;
  editExercise?: Exercise | null;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Klatka piersiowa', 'Plecy', 'Nogi', 'Barki',
  'Biceps', 'Triceps', 'Brzuch', 'Cardio', 'Ramiona', 'Całe ciało',
];

const DIFFICULTIES: Difficulty[] = ['Początkujący', 'Średniozaawansowany', 'Zaawansowany'];

const muscleGroupEmoji: Record<string, string> = {
  'Klatka piersiowa': '💪',
  'Plecy': '🔙',
  'Nogi': '🦵',
  'Barki': '🏋️',
  'Biceps': '💪',
  'Triceps': '💪',
  'Brzuch': '🎯',
  'Cardio': '🏃',
  'Ramiona': '💪',
  'Całe ciało': '🌟',
};

const difficultyBg: Record<Difficulty, string> = {
  'Początkujący': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Średniozaawansowany': 'bg-amber-100 text-amber-700 border-amber-200',
  'Zaawansowany': 'bg-red-100 text-red-700 border-red-200',
};

interface FormState {
  name: string;
  muscleGroup: MuscleGroup;
  difficulty: Difficulty;
  description: string;
  sets: string;
  reps: string;
  restTime: string;
  duration: string;
}

function InputField({
  label, value, onChange, placeholder, type = 'text', min, step, required, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; min?: string; step?: string;
  required?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-violet-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
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

export default function CreateExerciseModal({ onSave, onClose, editExercise }: CreateExerciseModalProps) {
  const isEdit = !!editExercise;

  const [form, setForm] = useState<FormState>({
    name: editExercise?.name ?? '',
    muscleGroup: editExercise?.muscleGroup ?? 'Klatka piersiowa',
    difficulty: editExercise?.difficulty ?? 'Początkujący',
    description: editExercise?.description ?? '',
    sets: String(editExercise?.sets ?? 3),
    reps: editExercise?.reps ?? '10-12',
    restTime: String(editExercise?.restTime ?? 60),
    duration: String(editExercise?.duration ?? 30),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [step, setStep] = useState<1 | 2>(1);

  const setField = (key: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [key]: v }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Nazwa jest wymagana';
    if (!form.description.trim()) newErrors.description = 'Opis jest wymagany';
    if (form.muscleGroup !== 'Cardio') {
      if (!form.sets || parseInt(form.sets) < 1) newErrors.sets = 'Podaj liczbę serii (min. 1)';
      if (!form.reps.trim()) newErrors.reps = 'Podaj zakres powtórzeń';
    } else {
      if (!form.duration || parseInt(form.duration) < 1) newErrors.duration = 'Podaj czas trwania';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Nazwa jest wymagana' });
      return;
    }
    setStep(2);
  };

  const handleSave = () => {
    if (!validate()) return;
    const isCardio = form.muscleGroup === 'Cardio';
    const exercise: Exercise = {
      id: editExercise?.id ?? `custom-${Date.now()}`,
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      difficulty: form.difficulty,
      description: form.description.trim(),
      sets: isCardio ? 1 : parseInt(form.sets) || 3,
      reps: isCardio ? '' : form.reps,
      restTime: isCardio ? undefined : parseInt(form.restTime) || 60,
      duration: isCardio ? parseInt(form.duration) || 30 : undefined,
    };
    onSave(exercise);
  };

  const isCardio = form.muscleGroup === 'Cardio';
  const gradientClass = muscleGroupColors[form.muscleGroup] || 'from-violet-500 to-indigo-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden flex flex-col rounded-t-2xl"
        style={{
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Animated header */}
        <div className={`bg-gradient-to-r ${gradientClass} p-6 transition-all duration-500`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
                {isEdit ? 'Edytuj ćwiczenie' : 'Własne ćwiczenie'}
              </p>
              <h2 className="text-xl font-bold text-white">
                {form.name || (isEdit ? editExercise.name : 'Nowe ćwiczenie')}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-white/80 text-sm">{muscleGroupEmoji[form.muscleGroup]} {form.muscleGroup}</span>
                <span className="text-white/40">·</span>
                <span className="text-white/80 text-sm">{form.difficulty}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => { if (s === 1) setStep(1); if (s === 2) handleNext(); }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer
                    ${step === s ? 'bg-white text-violet-700' : step > s ? 'bg-white/40 text-white' : 'bg-white/20 text-white/60'}`}
                >
                  {step > s ? '✓' : s}
                </button>
                <span className={`text-xs font-medium ${step >= s ? 'text-white' : 'text-white/50'}`}>
                  {s === 1 ? 'Podstawowe' : 'Parametry'}
                </span>
                {s < 2 && <div className={`w-8 h-0.5 rounded ${step > s ? 'bg-white/60' : 'bg-white/20'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 1 ? (
            <>
              {/* Name */}
              <InputField
                label="Nazwa ćwiczenia"
                value={form.name}
                onChange={setField('name')}
                placeholder="np. Wyciskanie sztangi na skosie"
                required
                error={errors.name}
              />

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Opis <span className="text-violet-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={e => { setField('description')(e.target.value); }}
                  placeholder="Opisz technikę wykonania ćwiczenia..."
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400
                    resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition-all
                    ${errors.description ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>

              {/* Muscle Group */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  Grupa mięśniowa <span className="text-violet-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MUSCLE_GROUPS.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setField('muscleGroup')(g)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer
                        ${form.muscleGroup === g
                          ? 'border-violet-400 bg-violet-50 text-violet-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                        }`}
                    >
                      <span className="text-base">{muscleGroupEmoji[g]}</span>
                      <span className="text-xs leading-tight">{g}</span>
                      {form.muscleGroup === g && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-violet-500 ml-auto">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  Poziom trudności <span className="text-violet-500">*</span>
                </label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setField('difficulty')(d)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                        ${form.difficulty === d
                          ? difficultyBg[d] + ' border-current shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                    >
                      {d === 'Początkujący' ? '🟢 Początkujący' : d === 'Średniozaawansowany' ? '🟡 Średni' : '🔴 Zaawansowany'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-violet-50 rounded-xl p-3 flex items-center gap-3 border border-violet-100">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center text-lg flex-shrink-0`}>
                  {muscleGroupEmoji[form.muscleGroup]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{form.name}</p>
                  <p className="text-xs text-slate-500">{form.muscleGroup} · {form.difficulty}</p>
                </div>
              </div>

              {isCardio ? (
                <InputField
                  label="Czas trwania (minuty)"
                  value={form.duration}
                  onChange={setField('duration')}
                  type="number"
                  min="1"
                  placeholder="np. 30"
                  required
                  error={errors.duration}
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="Liczba serii"
                      value={form.sets}
                      onChange={setField('sets')}
                      type="number"
                      min="1"
                      placeholder="np. 3"
                      required
                      error={errors.sets}
                    />
                    <InputField
                      label="Powtórzenia"
                      value={form.reps}
                      onChange={setField('reps')}
                      placeholder="np. 10-12"
                      required
                      error={errors.reps}
                    />
                  </div>
                  <InputField
                    label="Przerwa między seriami (sekundy)"
                    value={form.restTime}
                    onChange={setField('restTime')}
                    type="number"
                    min="0"
                    step="5"
                    placeholder="np. 90"
                  />
                </>
              )}

              {/* Preview card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Podgląd ćwiczenia</p>
                <p className="text-sm font-bold text-slate-800">{form.name}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{form.description}</p>
                <div className="flex gap-2 flex-wrap pt-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyBg[form.difficulty]}`}>
                    {form.difficulty}
                  </span>
                  {isCardio
                    ? <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">⏱ {form.duration} min</span>
                    : <>
                        <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">🔁 {form.sets} serie</span>
                        <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">💪 {form.reps} powt.</span>
                        {form.restTime && <span className="text-[10px] text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">⏸ {form.restTime}s</span>}
                      </>
                  }
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">✨ Własne</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ← Wstecz
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.01] transition-all cursor-pointer"
            >
              Dalej →
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.01] transition-all cursor-pointer"
            >
              {isEdit ? '✓ Zapisz zmiany' : '✓ Utwórz ćwiczenie'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
