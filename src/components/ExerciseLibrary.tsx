import { useState, useMemo } from 'react';
import { exerciseLibrary, muscleGroupColors } from '../data/exercises';
import { Exercise } from '../types';
import CreateExerciseModal from './CreateExerciseModal';

interface ExerciseLibraryProps {
  customExercises: Exercise[];
  onAddCustomExercise: (ex: Exercise) => void;
  onUpdateCustomExercise: (ex: Exercise) => void;
  onDeleteCustomExercise: (id: string) => void;
}

const ALL = 'Wszystkie';

const difficultyLabel: Record<string, string> = {
  'Początkujący': '🟢 Początkujący',
  'Średniozaawansowany': '🟡 Średni',
  'Zaawansowany': '🔴 Zaawansowany',
};

const difficultyBg: Record<string, string> = {
  'Początkujący': 'bg-emerald-100 text-emerald-700',
  'Średniozaawansowany': 'bg-amber-100 text-amber-700',
  'Zaawansowany': 'bg-red-100 text-red-700',
};

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <p className="text-base font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ExerciseDetailModal({
  exercise,
  isCustom,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  isCustom: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
        style={{
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 0.5rem)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${muscleGroupColors[exercise.muscleGroup] || 'from-slate-500 to-slate-600'} p-6`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-start gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{exercise.name}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-white/80 text-sm">{exercise.muscleGroup}</span>
                <span className="text-white/50">·</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {exercise.difficulty}
                </span>
                {isCustom && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-violet-700">
                    ✨ Własne
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Opis</h3>
            <p className="text-slate-700 text-sm">{exercise.description}</p>
          </div>

          {exercise.muscleGroup === 'Cardio' ? (
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Czas" value={`${exercise.duration} min`} icon="⏱" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Serie" value={String(exercise.sets)} icon="🔁" />
              <StatBox label="Powtórzenia" value={exercise.reps || '—'} icon="💪" />
              <StatBox label="Przerwa" value={`${exercise.restTime}s`} icon="⏸" />
            </div>
          )}

          {/* Custom exercise actions */}
          {isCustom && (
            <div className="pt-2 border-t border-slate-100">
              {confirmDelete ? (
                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                  <p className="text-sm font-semibold text-red-700 mb-3">Usunąć to ćwiczenie?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={onDelete}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 cursor-pointer transition-colors"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold hover:bg-violet-100 cursor-pointer transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edytuj
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 cursor-pointer transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                    Usuń
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExerciseLibrary({
  customExercises,
  onAddCustomExercise,
  onUpdateCustomExercise,
  onDeleteCustomExercise,
}: ExerciseLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(ALL);
  const [selectedDifficulty, setSelectedDifficulty] = useState(ALL);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'custom'>('all');

  const allExercises = useMemo(() => [...exerciseLibrary, ...customExercises], [customExercises]);
  const displayedBase = activeTab === 'custom' ? customExercises : allExercises;

  const groups = useMemo(() => [ALL, ...Array.from(new Set(allExercises.map(e => e.muscleGroup)))], [allExercises]);
  const difficulties = [ALL, 'Początkujący', 'Średniozaawansowany', 'Zaawansowany'];

  const filtered = useMemo(() => {
    return displayedBase.filter(e => {
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());
      const matchGroup = selectedGroup === ALL || e.muscleGroup === selectedGroup;
      const matchDiff = selectedDifficulty === ALL || e.difficulty === selectedDifficulty;
      return matchSearch && matchGroup && matchDiff;
    });
  }, [search, selectedGroup, selectedDifficulty, displayedBase]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(e => {
      if (!map[e.muscleGroup]) map[e.muscleGroup] = [];
      map[e.muscleGroup].push(e);
    });
    return map;
  }, [filtered]);

  const isCustom = (ex: Exercise) => customExercises.some(c => c.id === ex.id);

  const handleSaveCustom = (exercise: Exercise) => {
    if (editingExercise) {
      onUpdateCustomExercise(exercise);
      if (selectedExercise?.id === exercise.id) setSelectedExercise(exercise);
    } else {
      onAddCustomExercise(exercise);
    }
    setShowCreateModal(false);
    setEditingExercise(null);
  };

  const handleEdit = (ex: Exercise) => {
    setSelectedExercise(null);
    setEditingExercise(ex);
    setShowCreateModal(true);
  };

  const handleDelete = (id: string) => {
    onDeleteCustomExercise(id);
    setSelectedExercise(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Biblioteka ćwiczeń</h1>
            <p className="text-slate-500 mt-1">
              {exerciseLibrary.length} wbudowanych
              {customExercises.length > 0 && ` · ${customExercises.length} własnych`}
            </p>
          </div>
          <button
            onClick={() => { setEditingExercise(null); setShowCreateModal(true); }}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden sm:inline">Dodaj własne</span>
            <span className="sm:hidden">Dodaj</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📚 Wszystkie ({allExercises.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ✨ Własne ({customExercises.length})
          </button>
        </div>

        {/* Custom exercises empty state */}
        {activeTab === 'custom' && customExercises.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-violet-200 p-12 text-center">
            <div className="text-5xl mb-4">💪</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Brak własnych ćwiczeń</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
              Stwórz własne ćwiczenie dostosowane do Twoich potrzeb i preferencji treningowych.
            </p>
            <button
              onClick={() => { setEditingExercise(null); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md cursor-pointer hover:scale-[1.02] transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Utwórz pierwsze ćwiczenie
            </button>
          </div>
        )}

        {/* Search & Filters */}
        {!(activeTab === 'custom' && customExercises.length === 0) && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Szukaj ćwiczenia lub grupy mięśniowej..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Group filter */}
            <div className="flex flex-wrap gap-1.5">
              {groups.map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGroup(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedGroup === g
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Difficulty filter */}
            <div className="flex gap-2 flex-wrap">
              {difficulties.map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDifficulty(d)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedDifficulty === d
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {d === ALL ? '📋 Wszystkie poziomy' : difficultyLabel[d]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 && !(activeTab === 'custom' && customExercises.length === 0) ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-500 font-medium">Brak wyników</p>
            <p className="text-slate-400 text-sm mt-1">Spróbuj innych kryteriów wyszukiwania</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, exercises]) => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${muscleGroupColors[group] || 'from-slate-400 to-slate-500'}`} />
                  <h2 className="text-base font-bold text-slate-700">{group}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{exercises.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exercises.map(ex => {
                    const custom = isCustom(ex);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExercise(ex)}
                        className="text-left bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all group cursor-pointer relative"
                      >
                        {custom && (
                          <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                            ✨ Własne
                          </span>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors leading-tight pr-10">
                            {ex.name}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{ex.description}</p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyBg[ex.difficulty]}`}>
                            {ex.difficulty}
                          </span>
                          {ex.muscleGroup !== 'Cardio' ? (
                            <span className="text-[10px] text-slate-400">{ex.sets} serie · {ex.reps} powt.</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">{ex.duration} min</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          isCustom={isCustom(selectedExercise)}
          onClose={() => setSelectedExercise(null)}
          onEdit={() => handleEdit(selectedExercise)}
          onDelete={() => handleDelete(selectedExercise.id)}
        />
      )}

      {/* Create / Edit modal */}
      {showCreateModal && (
        <CreateExerciseModal
          editExercise={editingExercise}
          onSave={handleSaveCustom}
          onClose={() => { setShowCreateModal(false); setEditingExercise(null); }}
        />
      )}
    </>
  );
}
