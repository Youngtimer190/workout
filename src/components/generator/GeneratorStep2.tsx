import { GeneratorPreferences, TrainingStyle, MuscleGroup } from '../../types';

interface Props {
  prefs: GeneratorPreferences;
  onChange: (p: Partial<GeneratorPreferences>) => void;
}

const trainingStyles: { id: TrainingStyle; label: string; emoji: string; desc: string; bestFor: string; days: string }[] = [
  {
    id: 'full_body',
    label: 'Full Body',
    emoji: '⚡',
    desc: 'Całe ciało na każdym treningu',
    bestFor: 'Budowa siły, ogólna sprawność',
    days: '2–4 dni',
  },
  {
    id: 'upper_lower',
    label: 'Góra / Dół',
    emoji: '↕️',
    desc: 'Naprzemiennie góra i dół ciała',
    bestFor: 'Balans siły i masy',
    days: '4 dni',
  },
  {
    id: 'push_pull_legs',
    label: 'Push / Pull / Legs',
    emoji: '🔄',
    desc: 'Podział na ćwiczenia pchające, ciągnące i nogi',
    bestFor: 'Budowa masy i siły',
    days: '3–6 dni',
  },
  {
    id: 'fbl',
    label: 'FBL Split',
    emoji: '🎯',
    desc: 'Podział anatomiczny z dużą częstotliwością',
    bestFor: 'Średniozaawansowani i zaawansowani',
    days: '4–5 dni',
  },
  {
    id: 'bro_split',
    label: 'Bro Split',
    emoji: '🦾',
    desc: '1 partia mięśniowa na trening',
    bestFor: 'Izolacja i detailing mięśni',
    days: '5–6 dni',
  },
];

const muscleGroups: { id: MuscleGroup; emoji: string; color: string }[] = [
  { id: 'Klatka piersiowa', emoji: '🫀', color: 'bg-red-100 border-red-300 text-red-700' },
  { id: 'Plecy', emoji: '🔙', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: 'Nogi', emoji: '🦵', color: 'bg-teal-100 border-teal-300 text-teal-700' },
  { id: 'Barki', emoji: '🏹', color: 'bg-pink-100 border-pink-300 text-pink-700' },
  { id: 'Biceps', emoji: '💪', color: 'bg-amber-100 border-amber-300 text-amber-700' },
  { id: 'Triceps', emoji: '🔱', color: 'bg-green-100 border-green-300 text-green-700' },
  { id: 'Brzuch', emoji: '⚡', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'Całe ciało', emoji: '🌟', color: 'bg-slate-100 border-slate-300 text-slate-700' },
];

const durations = [30, 45, 60, 75, 90];

export default function GeneratorStep2({ prefs, onChange }: Props) {
  const toggleMuscle = (muscle: string) => {
    const current = prefs.focusMuscles;
    const next = current.includes(muscle)
      ? current.filter(m => m !== muscle)
      : [...current, muscle];
    onChange({ focusMuscles: next });
  };

  return (
    <div className="space-y-8">
      {/* Training style */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Styl podziału treningowego</h3>
        <p className="text-sm text-slate-500 mb-4">Jak chcesz rozdzielić partie mięśniowe między dni?</p>
        <div className="space-y-3">
          {trainingStyles.map(s => (
            <button
              key={s.id}
              onClick={() => onChange({ trainingStyle: s.id })}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                prefs.trainingStyle === s.id
                  ? 'border-violet-500 bg-violet-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                prefs.trainingStyle === s.id ? 'bg-violet-100' : 'bg-slate-100'
              }`}>
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${prefs.trainingStyle === s.id ? 'text-violet-700' : 'text-slate-800'}`}>{s.label}</p>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s.days}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                <p className="text-xs text-violet-500 mt-0.5">Najlepszy dla: {s.bestFor}</p>
              </div>
              {prefs.trainingStyle === s.id && (
                <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Focus muscles */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Priorytety mięśniowe</h3>
        <p className="text-sm text-slate-500 mb-3">
          Wybierz partie, którym chcesz poświęcić więcej uwagi. Generator doda więcej ćwiczeń, serii i izolacji dla wybranych grup.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {muscleGroups.map(m => {
            const selected = prefs.focusMuscles.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMuscle(m.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  selected ? m.color + ' shadow-md scale-105' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{m.emoji}</span>
                {m.id}
                {selected && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {prefs.focusMuscles.length > 0 ? (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-1.5">
            <p className="text-xs font-semibold text-violet-700">
              🎯 Aktywne priorytety: {prefs.focusMuscles.join(', ')}
            </p>
            <ul className="text-xs text-violet-600 space-y-0.5">
              <li>• Priorytetowa partia zajmuje pierwsze miejsce w każdej sesji</li>
              <li>• +2 serie na ćwiczeniu compound (zamiast standardowych)</li>
              <li>• 3–4 ćwiczenia izolowane zamiast 1 (specjalizacja)</li>
              <li>• W splitach bro/PPL: partia przenoszona do primary muscles</li>
            </ul>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Brak priorytetu — generator równomiernie rozłoży objętość między wszystkie partie
          </p>
        )}
      </div>

      {/* Session duration */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Czas trwania sesji</h3>
        <p className="text-sm text-slate-500 mb-4">Ile minut masz na jeden trening?</p>
        <div className="flex gap-3 flex-wrap">
          {durations.map(d => (
            <button
              key={d}
              onClick={() => onChange({ sessionDuration: d })}
              className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                prefs.sessionDuration === d
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-slate-800 mb-1">Opcje dodatkowe</h3>

        {/* Cardio toggle */}
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
            prefs.includeCardio ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'
          }`}
          onClick={() => onChange({ includeCardio: !prefs.includeCardio })}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${prefs.includeCardio ? 'bg-sky-100' : 'bg-slate-100'}`}>
              🏃
            </div>
            <div>
              <p className="font-medium text-sm text-slate-800">Dodaj cardio na końcu</p>
              <p className="text-xs text-slate-500">Bieżnia / rower / HIIT po treningu siłowym</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${prefs.includeCardio ? 'bg-sky-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </div>
        </div>

        {/* Warmup toggle */}
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
            prefs.includeWarmup ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
          }`}
          onClick={() => onChange({ includeWarmup: !prefs.includeWarmup })}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${prefs.includeWarmup ? 'bg-amber-100' : 'bg-slate-100'}`}>
              🔥
            </div>
            <div>
              <p className="font-medium text-sm text-slate-800">Włącz rozgrzewkę</p>
              <p className="text-xs text-slate-500">10 min mobilizacji i aktywacji przed treningiem</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${prefs.includeWarmup ? 'bg-amber-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
