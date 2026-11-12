import { useEffect, useMemo, useState } from 'react';
import { WorkoutTemplate, Exercise, WorkoutDay, TEMPLATE_CATEGORY_GROUPS, normalizeTemplateCategory } from '../types';
import CreateTemplateModal from './CreateTemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import TemplateCard from './TemplateCard';
import { ClipboardIcon, SearchIcon, SlidersIcon, XIcon } from './icons';
import { pluralWorkout } from '../lib/format';

type SortMode = 'recent' | 'name' | 'newest';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'recent', label: 'Ostatnio używane' },
  { id: 'newest', label: 'Najnowsze' },
  { id: 'name', label: 'Nazwa A–Z' },
];

interface TemplatesViewProps {
  templates: WorkoutTemplate[];
  availableExercises: Exercise[];
  days: WorkoutDay[];
  loading: boolean;
  error: string | null;
  onCreateTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (id: string) => void | Promise<WorkoutTemplate | null>;
  onRestoreTemplate?: (template: WorkoutTemplate) => void;
  onDuplicateTemplate?: (template: WorkoutTemplate) => void;
  onApplyTemplate: (template: WorkoutTemplate, exercises: Exercise[], mode: 'append' | 'replace', dayId: string) => void;
  /** Przełącza przypięcie szablonu. */
  onTogglePin?: (template: WorkoutTemplate) => void;
  /** Komunikat globalny aplikacji (toast). */
  onNotify?: (ok: boolean, text: string, actionLabel?: string, onAction?: () => void) => void;
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
  onRestoreTemplate,
  onDuplicateTemplate,
  onApplyTemplate,
  onTogglePin,
  onNotify,
}: TemplatesViewProps) {
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<WorkoutTemplate | null>(null);

  // Nowe dane → zamykamy rozwinięte karty.
  useEffect(() => {
    setExpandedId(null);
  }, [templates.length]);

  const toggleCategory = (cat: string) => {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const clearFilters = () => {
    setCategories([]);
    setSearch('');
  };

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = templates.filter(t => {
      const name = (t.name ?? '').toLowerCase();
      const desc = (t.description ?? '').toLowerCase();
      const exNames = (t.exercises ?? []).some(e => (e.name ?? '').toLowerCase().includes(q));
      const matchSearch = !q || name.includes(q) || desc.includes(q) || exNames;
      const matchCat = categories.length === 0 || categories.includes(normalizeTemplateCategory(t.category));
      return matchSearch && matchCat;
    });

    return list.sort((a, b) => {
      // Przypięte zawsze na górze.
      const pinDiff = Number(!!b.pinned) - Number(!!a.pinned);
      if (pinDiff !== 0) return pinDiff;

      switch (sort) {
        case 'name':
          return (a.name ?? '').localeCompare(b.name ?? '', 'pl');
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'recent':
        default: {
          const la = a.lastUsedAt;
          const lb = b.lastUsedAt;
          if (la && lb) return new Date(lb).getTime() - new Date(la).getTime();
          if (lb) return 1;
          if (la) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      }
    });
  }, [templates, search, categories, sort]);

  const handleSaveTemplate = (data: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      onUpdateTemplate({ ...data, id: editingTemplate.id, createdAt: editingTemplate.createdAt, updatedAt: new Date().toISOString() });
      onNotify?.(true, `Zapisano zmiany w szablonie „${data.name}”.`);
    } else {
      onCreateTemplate(data);
      onNotify?.(true, `Utworzono szablon „${data.name}”.`);
    }
    setShowCreateModal(false);
    setEditingTemplate(null);
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    const removed = await onDeleteTemplate(template.id);
    setEditingTemplate(null);
    // Toast pokazujemy zawsze (nazwa z karty), a „Cofnij” tylko wtedy,
    // gdy udało się odzyskać usunięty szablon.
    onNotify?.(
      true,
      `Usunięto szablon „${template.name}”.`,
      removed ? 'Cofnij' : undefined,
      removed ? () => onRestoreTemplate?.(removed) : undefined
    );
  };

  const handleDuplicate = (template: WorkoutTemplate) => {
    onDuplicateTemplate?.(template);
    onNotify?.(true, `Utworzono kopię szablonu „${template.name}”.`);
  };

  const filtersActive = categories.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Nagłówek ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            <ClipboardIcon className="h-6 w-6 text-violet-300" />
            Moje treningi
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {templates.length > 0
              ? `${templates.length} ${pluralWorkout(templates.length)} w zapasie — dodaj je do planu jednym kliknięciem`
              : 'Zapisz gotowe zestawy ćwiczeń i dodawaj je do planu jednym kliknięciem'}
          </p>
        </div>
        <button
          onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
          className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 self-start rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(139,92,246,1)] transition-all hover:brightness-110 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nowy szablon
        </button>
      </div>

      {/* ── Wyszukiwanie + filtry ── */}
      <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj szablonu, opisu lub ćwiczenia…"
              aria-label="Szukaj szablonu"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 transition-all focus:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-500/25"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Wyczyść wyszukiwanie"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filtry — zwijane na telefonie */}
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                filtersActive
                  ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
              }`}
            >
              <SlidersIcon className="h-3.5 w-3.5" />
              Filtry
              {filtersActive && (
                <span className="rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-bold text-violet-100">
                  {categories.length}
                </span>
              )}
            </button>

            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              <span className="sr-only sm:not-sr-only">Sortuj</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortMode)}
                aria-label="Sortowanie szablonów"
                className="cursor-pointer bg-transparent text-xs font-semibold text-slate-200 outline-none"
              >
                {SORTS.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#1a0d38]">{s.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filtersOpen && (
          <div className="space-y-3 border-t border-white/[0.07] pt-3">
            {TEMPLATE_CATEGORY_GROUPS.map(group => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.categories.map(cat => {
                    const active = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        aria-pressed={active}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                          active
                            ? 'border-violet-400/40 bg-violet-500/20 text-violet-100'
                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {filtersActive && (
              <button
                onClick={() => setCategories([])}
                className="text-[11px] font-semibold text-violet-300 underline underline-offset-2 transition-colors hover:text-violet-200 cursor-pointer"
              >
                Wyczyść filtry kategorii
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Licznik wyników ── */}
      {templates.length > 0 && (
        <p className="px-1 text-xs text-slate-500">
          {filteredTemplates.length === templates.length
            ? `Pokazujemy ${templates.length} ${pluralWorkout(templates.length)}`
            : `Pokazujemy ${filteredTemplates.length} z ${templates.length} ${pluralWorkout(templates.length)}`}
          {(search || filtersActive) && (
            <button
              onClick={clearFilters}
              className="ml-2 font-semibold text-violet-300 underline underline-offset-2 cursor-pointer"
            >
              Wyczyść
            </button>
          )}
        </p>
      )}

      {/* ── Błąd ── */}
      {error && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
          {error}
        </div>
      )}

      {/* ── Pusty stan ── */}
      {templates.length === 0 && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-violet-400/25 bg-white/[0.02] px-6 py-12 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/10 text-violet-200">
            <ClipboardIcon className="h-8 w-8" />
          </span>
          <h2 className="text-lg font-bold text-white">Nie masz jeszcze szablonów</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Szablon to gotowy zestaw ćwiczeń, który dodajesz do dowolnego dnia jednym kliknięciem.
            Najszybciej: w Planerze wybierz dzień i zapisz go jako szablon.
          </p>
          <button
            onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Utwórz pierwszy szablon
          </button>
        </div>
      )}

      {/* ── Lista ── */}
      {filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              expanded={expandedId === template.id}
              onToggleExpand={() => setExpandedId(expandedId === template.id ? null : template.id)}
              onApply={() => setApplyingTemplate(template)}
              onEdit={() => { setEditingTemplate(template); setShowCreateModal(true); }}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => handleDelete(template)}
              onTogglePin={() => onTogglePin?.(template)}
            />
          ))}
        </div>
      )}

      {/* ── Brak wyników przy filtrach ── */}
      {filteredTemplates.length === 0 && templates.length > 0 && (
        <div className="rounded-2xl border border-dashed border-violet-400/20 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-300">Nic nie pasuje do filtra</p>
          <p className="mt-1 text-xs text-slate-500">Zmień wyszukiwanie albo wyczyść filtry kategorii.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-xs font-semibold text-violet-300 underline underline-offset-2 cursor-pointer"
          >
            Wyczyść filtry
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <svg className="h-6 w-6 animate-spin text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* ── Modal tworzenia/edycji ── */}
      {showCreateModal && (
        <CreateTemplateModal
          onSave={handleSaveTemplate}
          onClose={() => { setShowCreateModal(false); setEditingTemplate(null); }}
          editTemplate={editingTemplate}
          availableExercises={availableExercises}
        />
      )}

      {/* ── Modal zastosowania ── */}
      {applyingTemplate && (
        <ApplyTemplateModal
          template={applyingTemplate}
          days={days}
          onApply={(exercises, mode, dayId, templateId) => {
            const templateToUse = templates.find(t => t.id === templateId) ?? applyingTemplate;
            if (templateToUse) {
              onApplyTemplate(templateToUse, exercises, mode, dayId);
            }
          }}
          onClose={() => setApplyingTemplate(null)}
        />
      )}
    </div>
  );
}
