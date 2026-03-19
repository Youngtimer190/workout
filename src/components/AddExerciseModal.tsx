import { useState, useMemo } from 'react';
import { Exercise } from '../types';
import { exerciseLibrary, muscleGroupBgColors } from '../data/exercises';

interface AddExerciseModalProps {
  dayName: string;
  onAdd: (exercise: Exercise) => void;
  onClose: () => void;
  customExercises?: Exercise[];
  onSaveCustom?: (exercise: Exercise) => void;
  onDeleteCustom?: (id: string) => void;
  onRequestCreate?: () => void;
}

const ALL_GROUPS = 'Wszystkie';

export default function AddExerciseModal({
  dayName,
  onAdd,
  onClose,
  customExercises = [],
  onSaveCustom: _onSaveCustom,
  onDeleteCustom,
  onRequestCreate,
}: AddExerciseModalProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>(ALL_GROUPS);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10-12');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('30');
  const [mobileStep, setMobileStep] = useState<'list' | 'config'>('list');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allExercises = useMemo(() => [...exerciseLibrary, ...customExercises], [customExercises]);
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
    if (confirmDeleteId) return;
    setSelectedExercise(ex);
    setSets(String(ex.sets || 3));
    setReps(ex.reps || '10-12');
    setDuration(String(ex.duration || 30));
    setMobileStep('config');
  };

  const handleDeleteConfirm = (id: string) => {
    onDeleteCustom?.(id);
    setConfirmDeleteId(null);
    if (selectedExercise?.id === id) {
      setSelectedExercise(null);
      setMobileStep('list');
    }
  };

  const handleAdd = () => {
    if (!selectedExercise) return;
    const isCardio = selectedExercise.muscleGroup === 'Cardio';
    onAdd({
      ...selectedExercise,
      sets: isCardio ? 1 : parseInt(sets) || 3,
      reps: isCardio ? '' : reps,
      weight: weight ? parseFloat(weight) : undefined,
      duration: isCardio ? parseInt(duration) : undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  const difficultyColor = (d: string) => {
    if (d === 'Początkujący') return 'bg-emerald-100 text-emerald-700';
    if (d === 'Średniozaawansowany') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const isCardio = selectedExercise?.muscleGroup === 'Cardio';

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
            <h2 className="text-base font-bold text-slate-800 leading-tight">Dodaj ćwiczenie</h2>
            <p className="text-xs text-slate-400 truncate">{dayName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <button
              onClick={() => onRequestCreate?.()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold transition-all cursor-pointer border border-violet-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Stwórz własne</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── MOBILE ── */}
          <div className="flex flex-col w-full md:hidden overflow-hidden">
            {mobileStep === 'list' && (
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

                {/* Lista — inline, bez ExerciseRow komponentu */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                  {filtered.map(ex => {
                    const isCustom = customExercises.some(c => c.id === ex.id);
                    const isSelected = selectedExercise?.id === ex.id;
                    const isConfirming = confirmDeleteId === ex.id;
                    return (
                      <div key={ex.id} className="rounded-xl overflow-hidden border border-slate-100">
                        <div className={`w-full text-left transition-all ${isSelected ? 'border-violet-400 bg-violet-50' : 'bg-white hover:bg-slate-50'} ${isConfirming ? 'bg-red-50' : ''}`}>
                          <div className="flex items-stretch">
                            <button onClick={() => handleSelect(ex)} className="flex-1 text-left p-3 cursor-pointer min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{ex.name}</p>
                                <div className="flex gap-1 flex-shrink-0">
                                  {isCustom && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">✨</span>}
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                                    {ex.difficulty === 'Początkujący' ? 'P' : ex.difficulty === 'Średniozaawansowany' ? 'Ś' : 'Z'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>{ex.muscleGroup}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Konfiguruj →</span>
                              </div>
                            </button>
                            {isCustom && onDeleteCustom && (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmDeleteId(isConfirming ? null : ex.id); }}
                                className={`flex-shrink-0 flex items-center justify-center w-11 border-l transition-all cursor-pointer ${isConfirming ? 'bg-red-500 border-red-400 text-white' : 'border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                                title="Usuń własne ćwiczenie"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        {isConfirming && (
                          <div className="bg-red-50 border-t border-red-200 px-3 py-2.5">
                            <p className="text-xs text-red-700 font-semibold mb-2">Usunąć „{ex.name}" z bazy własnych ćwiczeń?</p>
                            <div className="flex gap-2">
                              <button onClick={() => handleDeleteConfirm(ex.id)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold cursor-pointer">Tak, usuń</button>
                              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer">Anuluj</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">Brak ćwiczeń spełniających kryteria</div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile config — inline, bez ConfigPanel komponentu */}
            {mobileStep === 'config' && selectedExercise && (
              <div className="flex flex-col h-full">
                <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-shrink-0">
                  <button onClick={() => setMobileStep('list')} className="flex items-center gap-1.5 text-violet-600 text-sm font-semibold cursor-pointer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Wróć do listy
                  </button>
                </div>
                <div className="flex flex-col flex-1 p-4 overflow-y-auto">
                  <div className="mb-4">
                    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${muscleGroupBgColors[selectedExercise.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>{selectedExercise.muscleGroup}</span>
                    <h3 className="font-bold text-slate-800 text-base leading-tight">{selectedExercise.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedExercise.description}</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    {isCardio ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Czas (minuty)</label>
                        <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serie</label>
                            <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Powtórzenia</label>
                            <input type="text" value={reps} onChange={e => setReps(e.target.value)} placeholder="np. 8-12" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ciężar (kg) — opcjonalnie</label>
                          <input type="number" min="0" step="0.5" placeholder="np. 60" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notatki — opcjonalnie</label>
                      <textarea rows={2} placeholder="np. Powolne opuszczanie..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                  </div>
                  <button onClick={handleAdd} className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm shadow-md cursor-pointer">
                    ＋ Dodaj do planu
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── DESKTOP ── */}
          <div className="hidden md:flex w-full overflow-hidden">
            {/* Left: list */}
            <div className="w-1/2 flex flex-col border-r border-slate-100 overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex-shrink-0">
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
              <div className="px-4 pb-2 flex-shrink-0 flex flex-wrap gap-1.5">
                {groups.map(g => (
                  <button key={g} onClick={() => setSelectedGroup(g)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${selectedGroup === g ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {g}
                  </button>
                ))}
              </div>

              {/* Lista desktop — inline bez ExerciseRow */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {filtered.map(ex => {
                  const isCustom = customExercises.some(c => c.id === ex.id);
                  const isSelected = selectedExercise?.id === ex.id;
                  const isConfirming = confirmDeleteId === ex.id;
                  return (
                    <div key={ex.id} className="rounded-xl overflow-hidden border border-slate-100">
                      <div className={`w-full text-left transition-all ${isSelected ? 'border-violet-400 bg-violet-50' : 'bg-white hover:bg-slate-50'} ${isConfirming ? 'bg-red-50' : ''}`}>
                        <div className="flex items-stretch">
                          <button onClick={() => handleSelect(ex)} className="flex-1 text-left p-3 cursor-pointer min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{ex.name}</p>
                              <div className="flex gap-1 flex-shrink-0">
                                {isCustom && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">✨</span>}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColor(ex.difficulty)}`}>
                                  {ex.difficulty === 'Początkujący' ? 'P' : ex.difficulty === 'Średniozaawansowany' ? 'Ś' : 'Z'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>{ex.muscleGroup}</span>
                            </div>
                          </button>
                          {isCustom && onDeleteCustom && (
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDeleteId(isConfirming ? null : ex.id); }}
                              className={`flex-shrink-0 flex items-center justify-center w-11 border-l transition-all cursor-pointer ${isConfirming ? 'bg-red-500 border-red-400 text-white' : 'border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
                              title="Usuń własne ćwiczenie"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {isConfirming && (
                        <div className="bg-red-50 border-t border-red-200 px-3 py-2.5">
                          <p className="text-xs text-red-700 font-semibold mb-2">Usunąć „{ex.name}" z bazy?</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteConfirm(ex.id)} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold cursor-pointer">Tak, usuń</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer">Anuluj</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">Brak ćwiczeń spełniających kryteria</div>
                )}
              </div>
            </div>

            {/* Right: config desktop — inline bez ConfigPanel */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              {selectedExercise ? (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col flex-1 p-4 sm:p-5 overflow-y-auto">
                    <div className="mb-4">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${muscleGroupBgColors[selectedExercise.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>{selectedExercise.muscleGroup}</span>
                      <h3 className="font-bold text-slate-800 text-base leading-tight">{selectedExercise.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{selectedExercise.description}</p>
                    </div>
                    <div className="flex-1 space-y-3">
                      {isCardio ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Czas (minuty)</label>
                          <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Serie</label>
                              <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Powtórzenia</label>
                              <input type="text" value={reps} onChange={e => setReps(e.target.value)} placeholder="np. 8-12" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ciężar (kg) — opcjonalnie</label>
                            <input type="number" min="0" step="0.5" placeholder="np. 60" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notatki — opcjonalnie</label>
                        <textarea rows={2} placeholder="np. Powolne opuszczanie..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300" />
                      </div>
                    </div>
                    <button onClick={handleAdd} className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold text-sm shadow-md cursor-pointer">
                      ＋ Dodaj do planu
                    </button>
                  </div>
                </div>
              ) : (
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
