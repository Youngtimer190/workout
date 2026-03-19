import { GeneratorPreferences, TrainingGoal, FitnessLevel, EquipmentItem } from '../../types';
import EquipmentPicker from './EquipmentPicker';

interface Props {
  prefs: GeneratorPreferences;
  onChange: (p: Partial<GeneratorPreferences>) => void;
}

const goals: { id: TrainingGoal; label: string; emoji: string; desc: string; color: string }[] = [
  { id: 'muscle_gain',     label: 'Budowa masy',     emoji: '💪', desc: 'Hipertrofia mięśni, 8-12 powtórzeń', color: 'from-violet-500 to-purple-600' },
  { id: 'fat_loss',        label: 'Redukcja',         emoji: '🔥', desc: 'Spalanie tłuszczu, wysoka objętość', color: 'from-orange-500 to-red-600' },
  { id: 'strength',        label: 'Siła',             emoji: '🏋️', desc: 'Siła maksymalna, 3-6 powtórzeń',    color: 'from-blue-500 to-indigo-600' },
  { id: 'endurance',       label: 'Wytrzymałość',     emoji: '🏃', desc: 'Kondycja i wydolność',              color: 'from-emerald-500 to-teal-600' },
  { id: 'general_fitness', label: 'Ogólna sprawność', emoji: '⚡', desc: 'Balans siły i kondycji',            color: 'from-amber-500 to-yellow-600' },
];

const levels: { id: FitnessLevel; label: string; emoji: string; desc: string }[] = [
  { id: 'beginner',     label: 'Początkujący',        emoji: '🌱', desc: 'Trenuję krócej niż rok' },
  { id: 'intermediate', label: 'Średniozaawansowany', emoji: '⚙️', desc: '1–3 lata treningu' },
  { id: 'advanced',     label: 'Zaawansowany',        emoji: '🚀', desc: 'Ponad 3 lata treningu' },
];

const DAYS = [
  { index: 0, short: 'Pn', full: 'Poniedziałek' },
  { index: 1, short: 'Wt', full: 'Wtorek' },
  { index: 2, short: 'Śr', full: 'Środa' },
  { index: 3, short: 'Cz', full: 'Czwartek' },
  { index: 4, short: 'Pt', full: 'Piątek' },
  { index: 5, short: 'Sb', full: 'Sobota' },
  { index: 6, short: 'Nd', full: 'Niedziela' },
];

// Sugestie gotowych zestawów dni
const DAY_PRESETS: { label: string; days: number[]; desc: string }[] = [
  { label: '2×',  days: [1, 4],          desc: 'Wt, Pt' },
  { label: '3×',  days: [0, 2, 4],       desc: 'Pn, Śr, Pt' },
  { label: '4×',  days: [0, 1, 3, 4],    desc: 'Pn, Wt, Cz, Pt' },
  { label: '5×',  days: [0, 1, 2, 3, 4], desc: 'Pn–Pt' },
  { label: '6×',  days: [0, 1, 2, 3, 4, 5], desc: 'Pn–Sb' },
];

function toggleDay(current: number[], dayIndex: number): number[] {
  if (current.includes(dayIndex)) {
    if (current.length <= 1) return current; // min 1 dzień
    return current.filter(d => d !== dayIndex).sort((a, b) => a - b);
  }
  if (current.length >= 6) return current; // max 6 dni
  return [...current, dayIndex].sort((a, b) => a - b);
}

function getRestDayInfo(trainingDays: number[]): string {
  const restCount = 7 - trainingDays.length;
  if (restCount === 0) return 'Brak dni odpoczynku — rozważ przynajmniej 1 dzień';
  if (restCount === 1) return `${restCount} dzień odpoczynku`;
  return `${restCount} dni odpoczynku`;
}

function getConsecutiveWarning(trainingDays: number[]): string | null {
  const sorted = [...trainingDays].sort((a, b) => a - b);
  let maxConsecutive = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 1;
    }
  }
  if (maxConsecutive >= 4) return '⚠️ Więcej niż 3 dni z rzędu może utrudniać regenerację';
  return null;
}

export default function GeneratorStep1({ prefs, onChange }: Props) {
  const warning = getConsecutiveWarning(prefs.trainingDays);

  const handleDayToggle = (dayIndex: number) => {
    const newDays = toggleDay(prefs.trainingDays, dayIndex);
    onChange({ trainingDays: newDays, daysPerWeek: newDays.length });
  };

  const handlePreset = (days: number[]) => {
    onChange({ trainingDays: days, daysPerWeek: days.length });
  };

  return (
    <div className="space-y-10">

      {/* ─── Cel treningowy ─────────────────────────────────────────────────── */}
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

      {/* ─── Poziom zaawansowania ────────────────────────────────────────────── */}
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

      {/* ─── Wybór dni treningowych ──────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">W które dni chcesz trenować?</h3>
        <p className="text-sm text-slate-500 mb-4">
          Zaznacz konkretne dni — trening zostanie umieszczony dokładnie w tych dniach
        </p>

        {/* Szybkie presety */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Szybki wybór</p>
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map(preset => {
              const isActive =
                preset.days.length === prefs.trainingDays.length &&
                preset.days.every(d => prefs.trainingDays.includes(d));
              return (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.days)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  <span className="font-bold">{preset.label}</span>
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-violet-200' : 'text-slate-400'}`}>
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Siatka dni tygodnia */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {DAYS.map(day => {
            const isSelected = prefs.trainingDays.includes(day.index);
            const isWeekend = day.index >= 5;
            return (
              <button
                key={day.index}
                onClick={() => handleDayToggle(day.index)}
                className={`
                  relative flex flex-col items-center justify-center
                  rounded-xl sm:rounded-2xl border-2 py-3 sm:py-4
                  transition-all duration-200 cursor-pointer select-none
                  ${isSelected
                    ? 'bg-gradient-to-b from-violet-500 to-indigo-600 border-violet-500 text-white shadow-lg shadow-violet-200 scale-[1.05]'
                    : isWeekend
                      ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-violet-300 hover:bg-violet-50'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'
                  }
                `}
              >
                <span className={`text-xs font-semibold ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
                  {isWeekend ? '🌙' : ''}
                </span>
                <span className={`text-sm sm:text-base font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                  {day.short}
                </span>
                {isSelected && (
                  <span className="mt-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Podsumowanie wyboru */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-700">
              {prefs.trainingDays.length} {prefs.trainingDays.length === 1 ? 'dzień treningowy' : 'dni treningowe'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
            <span className="text-sm text-slate-500">{getRestDayInfo(prefs.trainingDays)}</span>
          </div>
        </div>

        {/* Ostrzeżenie o konsekutywnych dniach */}
        {warning && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <span className="text-sm text-amber-700">{warning}</span>
          </div>
        )}

        {/* Wybrane dni jako chipy */}
        {prefs.trainingDays.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {prefs.trainingDays.map(di => (
              <span
                key={di}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium"
              >
                💪 {DAYS[di].full}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Sprzęt ──────────────────────────────────────────────────────────── */}
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
