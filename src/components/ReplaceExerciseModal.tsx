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

const difficultyColor = (d: string) => {
  if (d === 'Początkujący') return 'bg-emerald-100 text-emerald-700';
  if (d === 'Średniozaawansowany') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

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

  const handleSelect = (ex: Exercise) => {
    setSelectedExercise(ex);
    setSets(String(ex.sets || currentExercise.sets || 3));
    setReps(ex.reps || currentExercise.reps || '10-12');
    setDuration(String(ex.duration || currentExercise.duration || 30));
    setMobileStep('config');
  };

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

  const ConfigPanel = () => (
    <div className="flex flex-col h-full">
      {/* Mobile back */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={() => setMobileStep('list')}
          className="flex items-center gap-1.5 text-amber-600 text-sm font-semibold cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Wróć do listy
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 sm:p-5 overflow-y-auto">
        <div className="mb-4">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${muscleGroupBgColors[selectedExercise!.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>
            {selectedExercise!.muscleGroup}
          </span>
          <h3 className="font-bold text-slate-800 text-base leading-tight">{selectedExercise!.name}</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedExercise!.description}</p>
        </div>

        <div className="flex-1 space-y-3">
          {isCardioSelected ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Czas (minuty)</label>
              <input
                type="number" min="1" value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serie</label>
                  <input
                    type="number" min="1" value={sets}
                    onChange={e => setSets(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Powtórzenia</label>
                  <input
                    type="text" value={reps} placeholder="np. 8-12"
                    onChange={e => setReps(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ciężar (kg) — opcjonalnie</label>
                <input
                  type="number" min="0" step="0.5" placeholder="np. 60" value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notatki — opcjonalnie</label>
            <textarea
              rows={2} placeholder="np. Powolne opuszczanie..." value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>

        <button
          onClick={handleReplace}
          className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-md shadow-amber-200 hover:shadow-amber-300 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Zamień ćwiczenie
        </button>
      </div>
    </div>
  );

  const ExerciseList = () => (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text" placeholder="Szukaj ćwiczenia..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
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
              selectedGroup === g ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {g}
            {g === (currentExercise.muscleGroup as string) && g !== ALL_GROUPS && (
              <span className="ml-1 opacity-60 text-[9px]">●</span>
            )}
          </button>
        ))}
      </div>

      {/* Same group hint */}
      {selectedGroup === (currentExercise.muscleGroup as string) && (
        <div className="mx-4 mb-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg flex-shrink-0">
          <p className="text-[11px] text-amber-700 font-medium">💡 Pokazuję alternatywy tej samej partii mięśniowej</p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.map(ex => {
          const isCustom = customExercises.some(c => c.id === ex.id);
          const isSameGroup = ex.muscleGroup === currentExercise.muscleGroup;
          return (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedExercise?.id === ex.id
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 active:bg-amber-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{ex.name}</p>
                <div className="flex gap-1 flex-shrink-0 items-center">
                  {isSameGroup && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">🎯</span>}
                  {isCustom && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">✨</span>}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                    {ex.difficulty === 'Początkujący' ? 'P' : ex.difficulty === 'Średniozaawansowany' ? 'Ś' : 'Z'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>
                  {ex.muscleGroup}
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden md:block">Konfiguruj →</span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            <div className="text-3xl mb-2">🔍</div>
            Brak ćwiczeń spełniających kryteria
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 0px)', height: '100dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600">
                <path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800 leading-tight">Zamień ćwiczenie</h2>
              <p className="text-xs text-slate-400 truncate">Aktualnie: <span className="font-semibold text-slate-600">{currentExercise.name}</span></p>
            </div>
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

          {/* ── Mobile step-based ── */}
          <div className="flex flex-col w-full md:hidden overflow-hidden">
            {mobileStep === 'list' && <ExerciseList />}
            {mobileStep === 'config' && selectedExercise && <ConfigPanel />}
          </div>

          {/* ── Desktop side-by-side ── */}
          <div className="hidden md:flex w-full overflow-hidden">
            <div className="w-1/2 flex flex-col border-r border-slate-100 overflow-hidden">
              <ExerciseList />
            </div>
            <div className="w-1/2 flex flex-col overflow-hidden">
              {selectedExercise ? (
                <ConfigPanel />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="text-4xl mb-3">👈</div>
                  <p className="text-slate-500 font-semibold text-sm mb-1">Wybierz nowe ćwiczenie</p>
                  <p className="text-slate-400 text-xs">Domyślnie pokazuję ćwiczenia tej samej partii mięśniowej</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
