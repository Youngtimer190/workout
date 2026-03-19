import { useState, useMemo } from 'react';
import { Exercise } from '../types';
import { exerciseLibrary, muscleGroupBgColors } from '../data/exercises';

interface ReplaceExerciseModalProps {
  currentExercise: Exercise;
  onReplace: (exercise: Exercise) => void;
  onClose: () => void;
  customExercises?: Exercise[];
}

const ALL_GROUPS = 'Wszystkie';



export default function ReplaceExerciseModal({
  currentExercise,
  onReplace,
  onClose,
  customExercises = [],
}: ReplaceExerciseModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>(currentExercise.muscleGroup as string);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState(String(currentExercise.sets || 3));
  const [reps, setReps] = useState(currentExercise.reps || '10-12');
  const [weight, setWeight] = useState(String(currentExercise.weight || ''));
  const [notes, setNotes] = useState(currentExercise.notes || '');
  const [duration, setDuration] = useState(String(currentExercise.duration || 30));
  const [mobileStep, setMobileStep] = useState<'list' | 'config'>('list');

  const allExercises = useMemo(
    () => [...exerciseLibrary, ...customExercises].filter(e => e.id !== currentExercise.id),
    [customExercises, currentExercise.id]
  );

  const groups = [ALL_GROUPS, ...Array.from(new Set(allExercises.map(e => e.muscleGroup)))];

  const filtered = useMemo(() => {
    return allExercises.filter(e => {
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase());
      const matchGroup = selectedGroup === ALL_GROUPS || e.muscleGroup === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [search, selectedGroup, allExercises]);



  const handleReplace = () => {
    if (!selectedExercise) return;
    const isCardio = selectedExercise.muscleGroup === 'Cardio';
    onReplace({
      ...selectedExercise,
      sets: isCardio ? 1 : parseInt(sets) || 3,
      reps: isCardio ? '' : reps,
      weight: weight ? parseFloat(weight) : undefined,
      duration: isCardio ? parseInt(duration) : undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const isCardioSelected = selectedExercise?.muscleGroup === 'Cardio';

  // Inline JSX zamiast sub-komponentu — zapobiega remontowaniu przy re-renderze
  const configPanelJsx = (
    <div className="flex flex-col h-full">
      <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={() => setMobileStep('list')}
          className="flex items-center gap-1 text-violet-600 text-sm font-medium cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Wróć do listy
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedExercise && (
          <div className={`p-3 rounded-xl ${muscleGroupBgColors[selectedExercise.muscleGroup] || 'bg-slate-100'} bg-opacity-60`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nowe ćwiczenie</p>
            <p className="text-sm font-bold text-slate-800">{selectedExercise.name}</p>
            <p className="text-xs text-slate-500">{selectedExercise.muscleGroup}</p>
          </div>
        )}

        {!isCardioSelected ? (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serie</label>
              <input
                type="number"
                value={sets}
                onChange={e => setSets(e.target.value)}
                min={1} max={10}
                inputMode="numeric"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Powtórzenia</label>
              <input
                type="text"
                value={reps}
                onChange={e => setReps(e.target.value)}
                placeholder="np. 8-12"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Ciężar (kg) <span className="text-slate-400 font-normal">opcjonalnie</span>
              </label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                min={0} step={0.5}
                inputMode="decimal"
                placeholder="np. 80"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Czas (min)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={1} max={120}
              inputMode="numeric"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Notatki <span className="text-slate-400 font-normal">opcjonalnie</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Wskazówki, tempo, technika..."
            rows={2}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={handleReplace}
          disabled={!selectedExercise}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
        >
          Zamień ćwiczenie
        </button>
      </div>
    </div>
  );

  const listPanel = (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Szukaj ćwiczenia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
          />
        </div>
      </div>
      {/* Filters */}
      <div className="px-4 pb-2 flex-shrink-0 flex flex-wrap gap-1.5">
        {groups.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGroup(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedGroup === g ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.map(ex => {
          const isCustom = customExercises.some(c => c.id === ex.id);
          const isSelected = selectedExercise?.id === ex.id;
          return (
            <button
              key={ex.id}
              onClick={() => {
                setSelectedExercise(ex);
                setSets(String(ex.sets || currentExercise.sets || 3));
                setReps(ex.reps || currentExercise.reps || '10-12');
                setDuration(String(ex.duration || currentExercise.duration || 30));
                setMobileStep('config');
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-violet-400 bg-violet-50'
                  : 'border-slate-100 bg-white hover:border-violet-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 leading-tight">{ex.name}</span>
                    {isCustom && <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">✨</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500">{ex.muscleGroup}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      ex.difficulty === 'Początkujący' ? 'bg-emerald-100 text-emerald-700' :
                      ex.difficulty === 'Średniozaawansowany' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{ex.difficulty}</span>
                  </div>
                </div>
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">Brak ćwiczeń spełniających kryteria</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          height: '100dvh',
          maxHeight: '100dvh',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-800 leading-tight">Zamień ćwiczenie</h2>
            <p className="text-xs text-slate-400 truncate">Zamieniane: {currentExercise.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0 ml-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── MOBILE ── */}
          <div className="flex flex-col w-full md:hidden overflow-hidden">
            {mobileStep === 'list' && listPanel}
            {mobileStep === 'config' && selectedExercise && configPanelJsx}
          </div>

          {/* ── DESKTOP ── */}
          <div className="hidden md:flex w-full overflow-hidden">
            <div className="w-1/2 flex flex-col border-r border-slate-100 overflow-hidden">
              {listPanel}
            </div>
            <div className="w-1/2 flex flex-col overflow-hidden">
              {selectedExercise ? configPanelJsx : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="text-slate-400 text-sm">Wybierz ćwiczenie z listy, aby skonfigurować szczegóły</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
