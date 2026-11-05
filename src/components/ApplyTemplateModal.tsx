import { useState } from 'react';
import { WorkoutTemplate, Exercise, WorkoutDay } from '../types';
import { muscleGroupColors } from '../data/exercises';

interface ApplyTemplateModalProps {
  template: WorkoutTemplate;
  /** Optional: if provided, shows template picker as first step */
  templates?: WorkoutTemplate[];
  days: WorkoutDay[];
  /** Optional: if provided, skips day picker and uses this day */
  preselectedDayId?: string;
  onApply: (exercises: Exercise[], mode: 'append' | 'replace', dayId: string, templateId: string) => void;
  onClose: () => void;
}

const muscleGroupEmoji: Record<string, string> = {
  'Klatka piersiowa': '💪', 'Plecy': '🔙', 'Nogi': '🦵', 'Barki': '🏋️',
  'Biceps': '💪', 'Triceps': '💪', 'Brzuch': '🎯', 'Cardio': '🏃',
  'Ramiona': '💪', 'Całe ciało': '🌟',
};

const getGradientClass = (color: string) => {
  const colorBase = color.replace('bg-', '').replace('-500', '');
  return `bg-gradient-to-r from-${colorBase}-500 to-${colorBase}-600`;
};

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const isCardio = exercise.muscleGroup === 'Cardio';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-100">
      <span className="text-xl">{muscleGroupEmoji[exercise.muscleGroup]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{exercise.name}</p>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          {exercise.muscleGroup}
          {exercise.requiredEquipment?.length && <span> · {exercise.requiredEquipment.join(', ')}</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!isCardio && (
          <>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">🔁 {exercise.sets}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">💪 {exercise.reps}</span>
          </>
        )}
        {isCardio && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">⏱ {exercise.duration} min</span>
        )}
        {exercise.isUnilateral && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">🔄 Jednostronne</span>
        )}
      </div>
    </div>
  );
}

export default function ApplyTemplateModal({ template, templates, days, preselectedDayId, onApply, onClose }: ApplyTemplateModalProps) {
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  // If preselectedDayId is provided, skip day picker (go to confirm after template picker or directly to confirm)
  // If a day is preselected (user clicked template icon on specific day), skip template picker and go directly to confirm
  const initialStep = preselectedDayId
    ? 'confirm'
    : templates && templates.length > 1
      ? 'pickTemplate'
      : 'pickDay';
  const [step, setStep] = useState<'pickTemplate' | 'pickDay' | 'confirm'>(initialStep);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate>(template);
  const [selectedDayId, setSelectedDayId] = useState<string>(preselectedDayId ?? '');

  // Use all templates if provided, otherwise just the single template
  const allTemplates = templates && templates.length > 0 ? templates : [template];

  const strengthExercises = selectedTemplate.exercises.filter(e => e.muscleGroup !== 'Cardio');
  const totalSets = strengthExercises.reduce((a, e) => a + (e.sets || 0), 0);

  // Filter out rest days by default, but show them if user wants
  const availableDays = days.filter(d => !d.isRestDay || d.exercises.length > 0);

  const handleTemplateSelect = (t: WorkoutTemplate) => {
    setSelectedTemplate(t);
    if (preselectedDayId) {
      setSelectedDayId(preselectedDayId);
      setStep('confirm');
    } else {
      setStep('pickDay');
    }
  };

  const handleDaySelect = (dayId: string) => {
    setSelectedDayId(dayId);
    setStep('confirm');
  };

  const handleConfirmApply = () => {
    const cleanExercises = selectedTemplate.exercises.map(ex => ({
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

  const gradientClass = selectedTemplate.color ? getGradientClass(selectedTemplate.color) : 'bg-gradient-to-r from-violet-500 to-indigo-600';

  // Step 1: Template picker (only if multiple templates provided)
  if (step === 'pickTemplate') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col rounded-t-2xl"
          style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-600 to-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Zastosuj szablon</p>
                <h2 className="text-xl font-bold text-white truncate">Wybierz szablon</h2>
                <p className="text-white/80 text-sm mt-2">{allTemplates.length} dostępnych szablonów</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Body - Template picker */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Wybierz szablon do zastosowania:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTemplates.map(t => {
                const tGradient = t.color ? getGradientClass(t.color) : 'bg-gradient-to-r from-violet-500 to-indigo-600';
                const tStrengthExercises = t.exercises.filter(e => e.muscleGroup !== 'Cardio');
                const tTotalSets = tStrengthExercises.reduce((a, e) => a + (e.sets || 0), 0);
                const tCardioCount = t.exercises.filter(e => e.muscleGroup === 'Cardio').length;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className="w-full p-4 rounded-xl border-2 text-left transition-all cursor-pointer hover:shadow-md hover:border-violet-300 border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tGradient}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{t.name}</p>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>}
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>{t.exercises.length} ćwiczeń</span>
                          <span>·</span>
                          <span>{tTotalSets} serii</span>
                          {tCardioCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-sky-600">{tCardioCount} cardio</span>
                            </>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Array.from(new Set(t.exercises.map(e => e.muscleGroup))).slice(0, 3).map(mg => (
                            <span key={mg} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-slate-100 text-slate-600'}`}>{mg}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="w-full py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Anuluj</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Day picker
  if (step === 'pickDay') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div
          className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col rounded-t-2xl"
          style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className={`p-4 ${gradientClass}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Zastosuj szablon</p>
                <h2 className="text-xl font-bold text-white truncate">{selectedTemplate.name}</h2>
                <p className="text-white/80 text-sm mt-2">{selectedTemplate.exercises.length} ćwiczeń do dodania</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Body - Day picker */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-700">Wybierz dzień, do którego dodać szablon:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableDays.map(day => (
                <button
                  key={day.id}
                  onClick={() => handleDaySelect(day.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    selectedDayId === day.id
                      ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold text-slate-800">{day.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    {day.exercises.length > 0 ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                        {day.exercises.length} ćwiczeń
                      </>
                    ) : (
                      <span className="text-slate-400">Pusty</span>
                    )}
                  </p>
                  {day.isRestDay && <p className="text-xs text-amber-600 mt-1">Dzień wolny</p>}
                </button>
              ))}
              {availableDays.length === 0 && (
                <div className="col-span-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-slate-500">Brak dni treningowych w tym tygodniu</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Anuluj</button>
            <button
              onClick={() => handleDaySelect(availableDays[0]?.id ?? '')}
              disabled={availableDays.length === 0}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer ${gradientClass} text-white ${availableDays.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Dalej →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Confirm with mode selector
  const selectedDay = days.find(d => d.id === selectedDayId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col rounded-t-2xl"
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className={`p-4 ${gradientClass}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Zastosuj szablon</p>
              <h2 className="text-xl font-bold text-white truncate">{selectedTemplate.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-white/80 text-sm">{selectedDay?.name ?? 'Wybierz dzień'}</span>
                <span className="text-white/40">·</span>
                <span className="text-white/80 text-sm">{selectedTemplate.exercises.length} ćwiczeń</span>
              </div>
            </div>
            <button onClick={() => { setStep('pickDay'); setSelectedDayId(''); }} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Template exercises */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Ćwiczenia do dodania</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedTemplate.exercises.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} />
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-2xl font-bold text-violet-600">{selectedTemplate.exercises.length}</p>
                <p className="text-[10px] text-slate-500">Ćwiczeń</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-2xl font-bold text-emerald-600">{totalSets}</p>
                <p className="text-[10px] text-slate-500">Serii</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-100">
                <p className="text-2xl font-bold text-amber-600">{selectedTemplate.exercises.filter(e => e.muscleGroup === 'Cardio').length}</p>
                <p className="text-[10px] text-slate-500">Cardio</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Array.from(new Set(selectedTemplate.exercises.map(e => e.muscleGroup))).map(mg => (
                <span key={mg} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-slate-100 text-slate-600'}`}>{mg}</span>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Jak dodać do dnia?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('append')}
                className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  mode === 'append'
                    ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-violet-600"><path d="M12 5v14M5 12h14" /></svg>
                  <span className="font-semibold text-slate-800">Dopisz</span>
                </div>
                <p className="text-xs text-slate-500">Dodaj na końcu istniejących ćwiczeń</p>
              </button>
              <button
                onClick={() => setMode('replace')}
                className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  mode === 'replace'
                    ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-amber-600"><path d="M21 4H8l7 7 7-7Zm-4 6v10" /></svg>
                  <span className="font-semibold text-slate-800">Zastąp</span>
                </div>
                <p className="text-xs text-slate-500">Usuń obecne i wstaw te z szablonu</p>
              </button>
            </div>
            {mode === 'replace' && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
                ⚠️ To usunie wszystkie obecne ćwiczenia z tego dnia. Operacji nie można cofnąć.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={() => { setStep('pickDay'); setSelectedDayId(''); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">Wstecz</button>
          <button
            onClick={handleConfirmApply}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer ${gradientClass} text-white`}
          >
            {mode === 'append' ? '✓ Dopisz do dnia' : '✓ Zastąp dzień'}
          </button>
        </div>
      </div>
    </div>
  );
}