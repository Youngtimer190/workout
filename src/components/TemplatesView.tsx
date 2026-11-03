import { useState, useMemo } from 'react';
import { WorkoutTemplate, Exercise, WorkoutDay } from '../types';
import { TEMPLATE_CATEGORIES } from '../types';
import { muscleGroupColors } from '../data/exercises';
import CreateTemplateModal from './CreateTemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import { TEMPLATE_COLORS } from '../types';

const muscleGroupEmoji: Record<string, string> = {
  'Klatka piersiowa': '💪', 'Plecy': '🔙', 'Nogi': '🦵', 'Barki': '🏋️',
  'Biceps': '💪', 'Triceps': '💪', 'Brzuch': '🎯', 'Cardio': '🏃',
  'Ramiona': '💪', 'Całe ciało': '🌟',
};

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onApply,
}: {
  template: WorkoutTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onApply: () => void;
}) {
  const colorBase = template.color.replace('bg-', '').replace('-500', '');
  const gradientClass = `bg-gradient-to-r from-${colorBase}-500 to-${colorBase}-600`;
  const strengthExercises = template.exercises.filter(e => e.muscleGroup !== 'Cardio');
  const totalSets = strengthExercises.reduce((a, e) => a + (e.sets || 0), 0);
  const cardioCount = template.exercises.filter(e => e.muscleGroup === 'Cardio').length;
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with color gradient */}
      <div className={`p-4 ${gradientClass}`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white truncate pr-8">{template.name}</h3>
            {template.description && <p className="text-white/80 text-sm mt-2 line-clamp-2">{template.description}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer" aria-label="Edytuj szablon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="p-2 rounded-xl bg-white/20 text-white hover:bg-red-500 hover:bg-white/30 transition-colors cursor-pointer"
              aria-label="Usuń szablon"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Remove confirmation - inline banner - shown right after header */}
      {showRemoveConfirm && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 flex items-center justify-between gap-3 animate-in">
          <p className="text-xs text-red-700 font-medium">Usunąć szablon <span className="font-bold">"{template.name}"</span>?</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onDelete(); setShowRemoveConfirm(false); }}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold active:bg-red-600 transition-colors cursor-pointer"
            >
              Usuń
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-600 text-xs font-semibold border border-slate-200 active:bg-slate-50 transition-colors cursor-pointer"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="font-bold text-violet-600">{template.exercises.length}</span> ćwiczeń
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="font-bold text-emerald-600">{totalSets}</span> serii
          </span>
          {cardioCount > 0 && (
            <span className="flex items-center gap-1 text-slate-600">
              <span className="font-bold text-amber-600">{cardioCount}</span> cardio
            </span>
          )}
        </div>

        {/* Muscle groups */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set(template.exercises.map(e => e.muscleGroup))).map(mg => (
            <span key={mg} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-slate-100 text-slate-600'}`}>
              {muscleGroupEmoji[mg]} {mg}
            </span>
          ))}
        </div>

        {/* Category badge */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">{template.category.toLowerCase()}</span>
          <button onClick={onApply} className="py-2 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer whitespace-nowrap">
            Zastosuj
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplatesViewProps {
  templates: WorkoutTemplate[];
  availableExercises: Exercise[];
  days: WorkoutDay[];
  loading: boolean;
  error: string | null;
  onCreateTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onApplyTemplate: (template: WorkoutTemplate) => void;
}

export default function TemplatesView({
  templates,
  availableExercises,
  days,
  loading,
  error,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onApplyTemplate,
}: TemplatesViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<WorkoutTemplate | null>(null);

  const categories = ['Wszystkie', ...TEMPLATE_CATEGORIES];

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.exercises.some(e => e.name.toLowerCase().includes(search.toLowerCase()));
      const matchCat = selectedCategory === 'Wszystkie' || t.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [templates, search, selectedCategory]);

  const handleSaveTemplate = (data: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      onUpdateTemplate({ ...data, id: editingTemplate.id, createdAt: editingTemplate.createdAt, updatedAt: new Date().toISOString() });
    } else {
      onCreateTemplate(data);
    }
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Moje treningi</h1>
          <p className="text-slate-500 mt-1">Zapisz szablony treningów i szybko dodawaj je do planu</p>
        </div>
        <button
          onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>
          <span className="hidden sm:inline">Nowy szablon</span>
          <span className="sm:hidden">Nowy</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder="Szukaj szablonu, opisu lub ćwiczenia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg></button>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${selectedCategory === cat ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {templates.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-violet-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Brak zapisanych szablonów</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">Utwórz swój pierwszy szablon treningu, aby szybko dodawać gotowe zestawy ćwiczeń do planu tygodniowego.</p>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-md cursor-pointer hover:scale-[1.02] transition-all"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4"><path d="M12 5v14M5 12h14" /></svg>Utwórz pierwszy szablon</button>
        </div>
      )}

      {/* Templates grid */}
      {filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => { setEditingTemplate(template); setShowCreateModal(true); }}
              onDelete={() => onDeleteTemplate(template.id)}
              onApply={() => setApplyingTemplate(template)}
            />
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && templates.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-500 font-medium">Brak pasujących szablonów</p>
          <p className="text-slate-400 text-sm mt-1">Spróbuj innych kryteriów wyszukiwania</p>
        </div>
      )}

      {/* Loading/Error */}
      {loading && <div className="flex items-center justify-center py-12"><svg className="w-6 h-6 text-violet-500 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">{error}</div>}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onSave={handleSaveTemplate}
          onClose={() => { setShowCreateModal(false); setEditingTemplate(null); }}
          editTemplate={editingTemplate}
          availableExercises={availableExercises}
        />
      )}

      {/* Apply Template Modal */}
      {applyingTemplate && (
        <ApplyTemplateModal
          template={applyingTemplate}
          days={days}
          onApply={(exercises, mode, dayId) => onApplyTemplate(applyingTemplate, exercises, mode, dayId)}
          onClose={() => setApplyingTemplate(null)}
        />
      )}
    </div>
  );
}