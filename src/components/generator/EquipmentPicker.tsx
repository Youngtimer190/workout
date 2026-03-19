import { EquipmentItem } from '../../types';

interface EquipmentOption {
  id: EquipmentItem;
  label: string;
  emoji: string;
  desc: string;
  category: string;
}

const equipmentOptions: EquipmentOption[] = [
  // Wolne ciężary
  { id: 'barbell',    label: 'Sztanga',          emoji: '🏋️', desc: 'Sztanga olimpijska + talerze', category: 'Wolne ciężary' },
  { id: 'dumbbells',  label: 'Hantle',            emoji: '🏃', desc: 'Para hantli lub komplet', category: 'Wolne ciężary' },
  { id: 'kettlebell', label: 'Kettlebell',        emoji: '🔔', desc: 'Ciężarek kulowy z uchwytem', category: 'Wolne ciężary' },
  // Sprzęt do ćwiczeń z masą ciała
  { id: 'pull_up_bar',  label: 'Drążek',          emoji: '🔩', desc: 'Drążek do podciągania', category: 'Masa ciała' },
  { id: 'dip_bars',     label: 'Poręcze',         emoji: '⊓',  desc: 'Poręcze do dipów', category: 'Masa ciała' },
  { id: 'resistance_bands', label: 'Gumy oporowe', emoji: '🟡', desc: 'Taśmy elastyczne', category: 'Masa ciała' },
  // Maszyny
  { id: 'bench',           label: 'Ławka',              emoji: '🛋️', desc: 'Ławka płaska/skośna', category: 'Sprzęt & maszyny' },
  { id: 'cable_machine',   label: 'Wyciąg / kablówka',  emoji: '⚙️', desc: 'Wyciąg górny i dolny', category: 'Sprzęt & maszyny' },
  { id: 'smith_machine',   label: 'Klatka Smitha',      emoji: '🏗️', desc: 'Maszyna Smith', category: 'Sprzęt & maszyny' },
  { id: 'leg_press',       label: 'Prasa do nóg',       emoji: '🦵', desc: 'Maszyna leg press / prostownik', category: 'Sprzęt & maszyny' },
  { id: 'leg_curl_machine',label: 'Maszyna do nóg',     emoji: '🔄', desc: 'Uginacz / leg curl', category: 'Sprzęt & maszyny' },
  // Cardio
  { id: 'treadmill',       label: 'Bieżnia',            emoji: '🏃', desc: 'Bieżnia elektryczna', category: 'Cardio' },
  { id: 'stationary_bike', label: 'Rower stacjonarny',  emoji: '🚲', desc: 'Rower treningowy / spinning', category: 'Cardio' },
  { id: 'rowing_machine',  label: 'Ergometr wioślarski',emoji: '🚣', desc: 'Wioślarz / rowing machine', category: 'Cardio' },
  { id: 'elliptical',      label: 'Orbitrek',           emoji: '🔄', desc: 'Maszyna eliptyczna', category: 'Cardio' },
  { id: 'battle_ropes',    label: 'Battle Ropes',       emoji: '🪢', desc: 'Liny bojowe', category: 'Cardio' },
  { id: 'jump_rope',       label: 'Skakanka',           emoji: '🪃', desc: 'Skakanka / jump rope', category: 'Cardio' },
];

const categories = ['Wolne ciężary', 'Masa ciała', 'Sprzęt & maszyny', 'Cardio'];

const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string; activeBg: string; activeBorder: string }> = {
  'Wolne ciężary':    { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', icon: '🏋️', activeBg: 'bg-orange-100',  activeBorder: 'border-orange-500' },
  'Masa ciała':       { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',icon: '🤸', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-500' },
  'Sprzęt & maszyny': { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   icon: '⚙️', activeBg: 'bg-blue-100',    activeBorder: 'border-blue-500' },
  'Cardio':           { bg: 'bg-pink-50',    border: 'border-pink-200',   text: 'text-pink-700',   icon: '❤️', activeBg: 'bg-pink-100',    activeBorder: 'border-pink-500' },
};

const PRESETS: { label: string; emoji: string; desc: string; items: EquipmentItem[] }[] = [
  {
    label: 'Pełna siłownia',
    emoji: '🏟️',
    desc: 'Pełen dostęp do sprzętu',
    items: ['barbell', 'dumbbells', 'kettlebell', 'pull_up_bar', 'dip_bars', 'bench', 'cable_machine', 'smith_machine', 'leg_press', 'leg_curl_machine', 'resistance_bands', 'treadmill', 'stationary_bike', 'rowing_machine', 'elliptical', 'battle_ropes', 'jump_rope'],
  },
  {
    label: 'Dom z hantlami',
    emoji: '🏠',
    desc: 'Hantle, drążek, ławka',
    items: ['dumbbells', 'pull_up_bar', 'bench', 'resistance_bands'],
  },
  {
    label: 'Tylko kettlebell',
    emoji: '🔔',
    desc: 'Jeden kettlebell',
    items: ['kettlebell'],
  },
  {
    label: 'Bez sprzętu',
    emoji: '🤸',
    desc: 'Masa własnego ciała',
    items: [],
  },
];

interface Props {
  selected: EquipmentItem[];
  onChange: (list: EquipmentItem[]) => void;
}

export default function EquipmentPicker({ selected, onChange }: Props) {
  const toggle = (id: EquipmentItem) => {
    if (selected.includes(id)) {
      onChange(selected.filter(e => e !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const applyPreset = (items: EquipmentItem[]) => {
    onChange(items);
  };

  const selectAll = () => onChange(equipmentOptions.map(e => e.id));
  const clearAll = () => onChange([]);

  const count = selected.length;
  const totalAvailable = count === 0
    ? 'masa własnego ciała (bodyweight)'
    : `${count} ${count === 1 ? 'rodzaj' : count < 5 ? 'rodzaje' : 'rodzajów'} sprzętu`;

  return (
    <div className="space-y-5">

      {/* Header info bar */}
      <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎒</span>
          <div>
            <p className="text-sm font-semibold text-violet-800">Wybrany sprzęt</p>
            <p className="text-xs text-violet-600">
              {count === 0
                ? 'Brak — trening z masą ciała'
                : `Wybrano: ${totalAvailable}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs font-medium text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Zaznacz wszystko
          </button>
          <button
            onClick={clearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            Wyczyść
          </button>
        </div>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Szybki wybór</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map(preset => {
            const isActive = JSON.stringify([...preset.items].sort()) === JSON.stringify([...selected].sort());
            return (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.items)}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                    : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                <div className="text-xl mb-1">{preset.emoji}</div>
                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-violet-700' : 'text-slate-700'}`}>
                  {preset.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{preset.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment by category */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wybierz dokładnie</p>
        {categories.map(cat => {
          const colors = categoryColors[cat];
          const items = equipmentOptions.filter(e => e.category === cat);
          const selectedInCat = items.filter(e => selected.includes(e.id)).length;

          return (
            <div key={cat} className={`rounded-2xl border ${colors.border} ${colors.bg} overflow-hidden`}>
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/50">
                <div className="flex items-center gap-2">
                  <span className="text-base">{colors.icon}</span>
                  <span className={`text-sm font-bold ${colors.text}`}>{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInCat > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${colors.text}`}>
                      {selectedInCat}/{items.length}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const allSelected = items.every(e => selected.includes(e.id));
                      if (allSelected) {
                        onChange(selected.filter(id => !items.find(e => e.id === id)));
                      } else {
                        const newIds = items.map(e => e.id).filter(id => !selected.includes(id));
                        onChange([...selected, ...newIds]);
                      }
                    }}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer bg-white/60 hover:bg-white ${colors.text}`}
                  >
                    {items.every(e => selected.includes(e.id)) ? 'Odznacz' : 'Wszystkie'}
                  </button>
                </div>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                {items.map(item => {
                  const isSelected = selected.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? `${colors.activeBg} ${colors.activeBorder} shadow-sm`
                          : 'bg-white border-white hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-violet-500 border-violet-500'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Emoji */}
                      <span className="text-xl leading-none flex-shrink-0">{item.emoji}</span>

                      {/* Text */}
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? colors.text : 'text-slate-700'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bodyweight always available note */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200">
        <span>💡</span>
        <span>
          <strong className="text-slate-600">Masa własnego ciała</strong> jest zawsze dostępna — pompki, podciągania i inne ćwiczenia bez sprzętu będą zawsze uwzględniane.
        </span>
      </div>
    </div>
  );
}
