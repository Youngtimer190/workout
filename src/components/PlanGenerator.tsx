import { useState, useEffect, useRef } from 'react';
import { GeneratorPreferences, GeneratedPlan, WorkoutDay } from '../types';
import { generatePlan } from '../data/generatorEngine';
import GeneratorStep1 from './generator/GeneratorStep1';
import GeneratorStep2 from './generator/GeneratorStep2';
import GeneratorStep3 from './generator/GeneratorStep3';

interface Props {
  onApplyPlan: (days: WorkoutDay[]) => void;
  onGoToPlanner: () => void;
}

const defaultPrefs: GeneratorPreferences = {
  goal: 'muscle_gain',
  fitnessLevel: 'intermediate',
  daysPerWeek: 4,
  trainingDays: [0, 1, 3, 4], // Pn, Wt, Cz, Pt
  equipment: 'full_gym',
  equipmentList: ['barbell', 'dumbbells', 'bench', 'cable_machine', 'pull_up_bar', 'leg_press', 'leg_curl_machine', 'dip_bars', 'treadmill', 'stationary_bike'],
  trainingStyle: 'push_pull_legs',
  focusMuscles: [],
  sessionDuration: 60,
  includeCardio: false,
  includeWarmup: true,
};

const steps = [
  { id: 1, label: 'Podstawy', icon: '🎯', desc: 'Cel i poziom' },
  { id: 2, label: 'Styl', icon: '⚙️', desc: 'Plan i preferencje' },
  { id: 3, label: 'Wynik', icon: '📋', desc: 'Podgląd planu' },
];

export default function PlanGenerator({ onApplyPlan, onGoToPlanner }: Props) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<GeneratorPreferences>(defaultPrefs);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [applied, setApplied] = useState(false);
  // Zapamiętaj ID ćwiczeń z poprzedniego planu, żeby nie powtarzać przy regeneracji
  const [lastPlanExerciseIds, setLastPlanExerciseIds] = useState<Set<string>>(new Set());

  const updatePrefs = (partial: Partial<GeneratorPreferences>) => {
    setPrefs(prev => ({ ...prev, ...partial }));
  };

  // Wyciąga bazowe ID ćwiczeń z planu (bez sufixów -d0-xxx-p)
  const extractBaseIds = (plan: GeneratedPlan): Set<string> => {
    const ids = new Set<string>();
    plan.days.forEach(day => {
      day.exercises.forEach(ex => {
        // Bazowe ID to część przed '-d' (sufiks dodawany przez generator)
        const baseId = ex.id.split('-d')[0];
        ids.add(baseId);
        // Też dodaj pełne ID dla pewności
        ids.add(ex.id);
      });
    });
    return ids;
  };

  const topRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    // Najbardziej niezawodna metoda dla Safari iOS
    topRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // useEffect reaguje NA PEWNO po re-renderze — gwarantowany scroll po zmianie kroku
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setLastPlanExerciseIds(new Set());
    setTimeout(() => {
      const plan = generatePlan(prefs, new Set());
      setGeneratedPlan(plan);
      setLastPlanExerciseIds(extractBaseIds(plan));
      setIsGenerating(false);
      setStep(3);
    }, 800);
  };

  const handleRegenerate = () => {
    setIsGenerating(true);
    scrollToTop();
    setTimeout(() => {
      const plan = generatePlan(prefs, lastPlanExerciseIds);
      setGeneratedPlan(plan);
      setLastPlanExerciseIds(extractBaseIds(plan));
      setIsGenerating(false);
    }, 600);
  };

  const handleApply = () => {
    if (!generatedPlan) return;
    onApplyPlan(generatedPlan.days);
    setApplied(true);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      handleGenerate();
    } else if (step < 3) {
      setStep(s => s + 1);
    }
  };

  // Applied success screen
  if (applied) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-200 animate-bounce">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Plan zastosowany! 🎉</h2>
          <p className="text-slate-500 mt-2 max-w-sm">
            Twój nowy plan treningowy został załadowany do Planera. Możesz go teraz dostosować do swoich potrzeb.
          </p>
        </div>
        <button
          onClick={onGoToPlanner}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Przejdź do Planera
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Niewidoczny anchor do scrollowania — musi być na samej górze */}
      <div ref={topRef} style={{ position: 'relative', top: '-80px', height: 0, visibility: 'hidden' }} aria-hidden="true" />
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Generator planów</h1>
            <p className="text-sm text-slate-500">Profesjonalny plan treningowy dopasowany do Ciebie</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5 sm:mb-8">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`flex items-center gap-2 w-full`}>
                <button
                  onClick={() => {
                    if (s.id < step || (s.id === 3 && generatedPlan)) setStep(s.id);
                  }}
                  disabled={s.id > step && !(s.id === 3 && generatedPlan)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 flex-shrink-0 ${
                    step === s.id
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                      : step > s.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.id ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.icon
                  )}
                </button>
                <div className="hidden sm:block">
                  <p className={`text-xs font-semibold ${step === s.id ? 'text-violet-600' : step > s.id ? 'text-emerald-600' : 'text-slate-400'}`}>{s.label}</p>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                </div>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 flex-1 rounded-full mx-2 transition-all duration-500 ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Step header bar */}
        <div className={`h-1.5 bg-gradient-to-r ${
          step === 1 ? 'from-violet-500 to-indigo-600 w-1/3' :
          step === 2 ? 'from-violet-500 to-indigo-600 w-2/3' :
          'from-emerald-500 to-teal-600 w-full'
        } transition-all duration-700`} />

        <div className="p-4 sm:p-6 md:p-8">
          {/* Step title */}
          {step !== 3 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {step === 1 && '🎯 Krok 1: Określ swój cel'}
                {step === 2 && '⚙️ Krok 2: Styl treningowy'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {step === 1 && 'Powiedz nam o sobie — dobierzemy optymalny plan treningowy'}
                {step === 2 && 'Skonfiguruj strukturę i preferencje swojego planu'}
              </p>
            </div>
          )}

          {/* Generating overlay */}
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-24 gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-800">Generuję plan...</h3>
                <p className="text-sm text-slate-500 mt-1">Analizuję parametry i dobieramy ćwiczenia</p>
              </div>
              <div className="flex gap-2">
                {['Cel', 'Poziom', 'Split', 'Ćwiczenia'].map((label, i) => (
                  <div
                    key={label}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-600 animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {step === 1 && <GeneratorStep1 prefs={prefs} onChange={updatePrefs} />}
              {step === 2 && <GeneratorStep2 prefs={prefs} onChange={updatePrefs} />}
              {step === 3 && generatedPlan && (
                <GeneratorStep3
                  plan={generatedPlan}
                  onApply={handleApply}
                  onRegenerate={handleRegenerate}
                />
              )}
            </>
          )}
        </div>

        {/* Navigation footer (only steps 1-2) */}
        {step < 3 && !isGenerating && (
          <div className="px-6 md:px-8 pb-6 md:pb-8 flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                step === 1
                  ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                  : 'text-slate-600 bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Wstecz
            </button>

            {/* Preview chip */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
              <span>🎯 {prefs.goal === 'muscle_gain' ? 'Masa' : prefs.goal === 'fat_loss' ? 'Redukcja' : prefs.goal === 'strength' ? 'Siła' : prefs.goal === 'endurance' ? 'Wytrzymałość' : 'Sprawność'}</span>
              <span>📅 {prefs.daysPerWeek} dni/tydz.</span>
              <span>⏱ {prefs.sessionDuration} min</span>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.03] transition-all duration-200 cursor-pointer"
            >
              {step === 2 ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generuj plan
                </>
              ) : (
                <>
                  Dalej
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      {step < 3 && !isGenerating && (
        <div className="mt-6 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm flex-shrink-0">
              💡
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800">
                {step === 1 ? 'Wskazówka: Cel treningowy' : 'Wskazówka: Dobór podziału'}
              </p>
              <p className="text-xs text-violet-600 mt-1">
                {step === 1
                  ? 'Dla najlepszych efektów wybierz jeden główny cel. Można go zmienić po 8–12 tygodniach treningu.'
                  : 'Push/Pull/Legs to jeden z najlepszych podziałów dla 4–6 dni/tydz. Full Body świetnie sprawdza się przy 2–3 dniach.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
