import { useEffect, useRef, useState } from 'react';
import { WorkoutTemplate } from '../types';
import { normalizeTemplateCategory, templateGradient } from '../types';
import { muscleGroupColors } from '../data/exercises';
import { ChevronDownIcon, CopyIcon, MoreIcon, PencilIcon, PinIcon, TrashIcon } from './icons';
import { formatRelativePL, pluralExercise, pluralSet } from '../lib/format';

interface TemplateCardProps {
  template: WorkoutTemplate;
  /** Czy karta jest rozwinięta (pełna lista ćwiczeń). */
  expanded: boolean;
  onToggleExpand: () => void;
  onApply: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

/**
 * Karta szablonu treningu.
 *
 * Nagłówek ma gradient z MAPY STATYCZNEJ (`templateGradient`) — klasa
 * sklejana w runtime nigdy nie trafiłaby do CSS i nagłówek był pusty.
 */
export default function TemplateCard({
  template,
  expanded,
  onToggleExpand,
  onApply,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePin,
}: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Zamknij menu po kliknięciu w anywhere i po Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const exercises = Array.isArray(template.exercises) ? template.exercises : [];
  const strength = exercises.filter(e => e.muscleGroup !== 'Cardio');
  const totalSets = strength.reduce((a, e) => a + (e.sets || 0), 0);
  const cardioCount = exercises.length - strength.length;
  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscleGroup)));
  const shown = expanded ? exercises : exercises.slice(0, 3);
  const gradient = templateGradient(template.color);
  const created = formatRelativePL(template.createdAt);
  const lastUsed = template.lastUsedAt ? formatRelativePL(template.lastUsedAt) : null;
  const pinned = !!template.pinned;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-colors ${
        pinned
          ? 'border-cyan-400/40 bg-white/[0.05]'
          : 'border-white/[0.07] bg-white/[0.03] hover:border-cyan-400/25'
      }`}
    >
      {/* ── Nagłówek ── */}
      <div className={`${gradient} relative flex items-start gap-3 p-4`}>
        {pinned && (
          <span
            className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/25 text-white"
            title="Przypięty"
          >
            <PinIcon className="h-3.5 w-3.5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-base font-bold leading-tight text-white ${pinned ? 'pl-8' : ''}`}>
            {template.name}
          </h3>
          {template.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/80">{template.description}</p>
          )}
        </div>

        {/* Menu „⋯” */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Menu szablonu ${template.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <MoreIcon className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0f1f42]/97 py-1 shadow-2xl backdrop-blur-xl"
            >
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onTogglePin(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.07] cursor-pointer"
              >
                <PinIcon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                {pinned ? 'Odepnij' : 'Przypnij'}
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.07] cursor-pointer"
              >
                <PencilIcon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                Edytuj
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onDuplicate(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.07] cursor-pointer"
              >
                <CopyIcon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                Duplikuj
              </button>
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/15 cursor-pointer"
              >
                <TrashIcon className="h-3.5 w-3.5 flex-shrink-0 text-red-300" />
                Usuń
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Treść ── */}
      <div className="flex flex-1 flex-col p-4">
        {/* Statystyki */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <span>
            <span className="font-bold text-white">{exercises.length}</span>{' '}
            {pluralExercise(exercises.length)}
          </span>
          {totalSets > 0 && (
            <span>
              <span className="font-bold text-emerald-300">{totalSets}</span> {pluralSet(totalSets)}
            </span>
          )}
          {cardioCount > 0 && (
            <span>
              <span className="font-bold text-amber-300">{cardioCount}</span> cardio
            </span>
          )}
        </div>

        {/* Podgląd ćwiczeń */}
        {exercises.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {shown.map((ex, i) => (
              <li key={`${ex.id}-${i}`} className="flex items-baseline gap-2 text-xs text-slate-300">
                <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400/70" />
                <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                {ex.muscleGroup === 'Cardio' ? (
                  ex.duration ? (
                    <span className="flex-shrink-0 text-[11px] text-slate-500">{ex.duration} min</span>
                  ) : null
                ) : ex.sets ? (
                  <span className="flex-shrink-0 text-[11px] text-slate-500">
                    {ex.sets} × {ex.reps ?? ''}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {exercises.length > 3 && (
          <button
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-cyan-300 transition-colors hover:text-cyan-200 cursor-pointer"
          >
            {expanded ? 'Zwiń listę' : `Pokaż wszystkie (${exercises.length})`}
            <ChevronDownIcon className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Grupy mięśni */}
        {muscleGroups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {muscleGroups.slice(0, 4).map(mg => (
              <span
                key={mg}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupColors[mg] || 'bg-white/[0.06] text-slate-300'}`}
              >
                {mg}
              </span>
            ))}
            {muscleGroups.length > 4 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400">
                +{muscleGroups.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Metadane */}
        <p className="mt-3 text-[11px] text-slate-500" title={lastUsed?.title || created.title}>
          {lastUsed
            ? <>Ostatnio użyty · {lastUsed.text}</>
            : <>Dodano {created.text || '—'}</>}
        </p>

        {/* Stopka */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
          <span className="truncate text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200">
            {normalizeTemplateCategory(template.category)}
          </span>
          <button
            onClick={onApply}
            className="min-h-[40px] flex-shrink-0 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 cursor-pointer"
          >
            Zastosuj
          </button>
        </div>
      </div>
    </article>
  );
}
