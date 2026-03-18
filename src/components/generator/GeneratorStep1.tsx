import { GeneratorPreferences, TrainingGoal, FitnessLevel, EquipmentItem } from '../../types';
import EquipmentPicker from './EquipmentPicker';

interface Props {
  prefs: GeneratorPreferences;
  onChange: (p: Partial<GeneratorPreferences>) => void;
}

const goals: { id: TrainingGoal; label: string; emoji: string; desc: string; color: string }[] = [
  { id: 'muscle_gain',    label: 'Budowa masy',      emoji: '💪', desc: 'Hipertrofia mięśni, 8-12 powtórzeń', color: 'from-violet-500 to-purple-600' },
  { id: 'fat_loss',       label: 'Redukcja',          emoji: '🔥', desc: 'Spalanie tłuszczu, wysoka objętość', color: 'from-orange-500 to-red-600' },
  { id: 'strength',       label: 'Siła',              emoji: '🏋️', desc: 'Siła maksymalna, 3-6 powtórzeń',    color: 'from-blue-500 to-indigo-600' },
  { id: 'endurance',      label: 'Wytrzymałość',      emoji: '🏃', desc: 'Kondycja i wydolność',              color: 'from-emerald-500 to-teal-600' },
  { id: 'general_fitness',label: 'Ogólna sprawność',  emoji: '⚡', desc: 'Balans siły i kondycji',            color: 'from-amber-500 to-yellow-600' },
];

const levels: { id: FitnessLevel; label: string; emoji: string; desc: string }[] = [
  { id: 'beginner',     label: 'Początkujący',           emoji: '🌱', desc: 'Trenuję krócej niż rok' },
  { id: 'intermediate', label: 'Średniozaawansowany',    emoji: '⚙️', desc: '1–3 lata treningu' },
  { id: 'advanced',     label: 'Zaawansowany',           emoji: '🚀', desc: 'Ponad 3 lata treningu' },
];

export default function GeneratorStep1({ prefs, onChange }: Props) {
  return (
    <div className="space-y-10">

      {/* ─── Cel treningowy ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Jaki jest Twój główny cel?</h3>
        <p className="text-sm text-slate-500 mb-4">Wybierz jeden cel — plan zostanie pod niego zoptymalizowany</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {goals.map(g => (
            <button
              key={g.id}
              onClick={() => onChange({ goal: g.id })}
              className={`relative group p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                prefs.goal === g.id
                  ? 'border-transparent shadow-lg scale-[1.02]'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {prefs.goal === g.id && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${g.color} opacity-10`} />
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br ${g.color} shadow-md`}>
                {g.emoji}
              </div>
              <p className="font-semibold text-slate-800 text-sm">{g.label}</p>
              <p className="text-xs text-slate-500 mt-1">{g.desc}</p>
              {prefs.goal === g.id && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br ${g.color} flex items-center justify-center`}>
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Poziom zaawansowania ─────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Twój poziom zaawansowania</h3>
        <p className="text-sm text-slate-500 mb-4">Dobierzemy odpowiednie ćwiczenia i objętość treningową</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {levels.map(l => (
            <button
              key={l.id}
              onClick={() => onChange({ fitnessLevel: l.id })}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                prefs.fitnessLevel === l.id
                  ? 'border-violet-500 bg-violet-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{l.emoji}</span>
              <p className={`font-semibold text-sm mt-2 ${prefs.fitnessLevel === l.id ? 'text-violet-700' : 'text-slate-800'}`}>{l.label}</p>
              <p className="text-xs text-slate-500 mt-1">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Dni w tygodniu ──────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Ile dni w tygodniu chcesz trenować?</h3>
        <p className="text-sm text-slate-500 mb-4">Optymalne dla większości: 3–5 dni</p>
        <div className="flex gap-2 flex-wrap">
          {[2, 3, 4, 5, 6].map(n => (
            <button
              key={n}
              onClick={() => onChange({ daysPerWeek: n })}
              className={`w-14 h-14 rounded-2xl font-bold text-lg transition-all duration-200 cursor-pointer ${
                prefs.daysPerWeek === n
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {prefs.daysPerWeek} {prefs.daysPerWeek === 1 ? 'dzień' : prefs.daysPerWeek < 5 ? 'dni' : 'dni'} treningowych · {7 - prefs.daysPerWeek} dni odpoczynku
        </p>
      </div>

      {/* ─── Sprzęt (nowy multi-select) ──────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Jakim sprzętem dysponujesz?</h3>
        <p className="text-sm text-slate-500 mb-4">
          Zaznacz wszystko, co masz dostęp — dobierzemy ćwiczenia tylko ze sprzętem, który posiadasz
        </p>
        <EquipmentPicker
          selected={prefs.equipmentList}
          onChange={(list: EquipmentItem[]) => onChange({ equipmentList: list })}
        />
      </div>

    </div>
  );
}
