import { useState } from 'react';
import { Exercise, WorkoutDay } from '../types';
import { muscleGroupBgColors } from '../data/exercises';
import {
  CheckIcon,
  ChevronRightIcon,
  DumbbellIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from './icons';

interface FavoritesViewProps {
  /** Identyfikatory ulubionych ćwiczeń. */
  favoriteIds: string[];
  /** Wszystkie dostępne ćwiczenia (biblioteka + własne) — po `id`. */
  allExercises: Exercise[];
  /** Dni bieżącego tygodnia — do wyboru dnia docelowego. */
  days: WorkoutDay[];
  /** Dodaje/usuwa ćwiczenie z ulubionych. */
  onToggleFavorite: (id: string) => void;
  /** Usuwa wszystkie ulubione. */
  onClearFavorites?: () => void;
  /** Dodaje ćwiczenia do wybranego dnia planu. */
  onAddToPlan: (dayId: string, exerciseIds: string[]) => void;
  /** Przenosi do Planera. */
  onGoToPlanner: () => void;
}

/**
 * Widok „Ulubione ćwiczenia” (skrót w pasku bocznym).
 *
 * Ćwiczenia rozpoznajemy po `id` — dla własnych ćwiczeń `id` jest generowane
 * lokalnie, więc lista ulubionych działa również dla nich.
 */
export default function FavoritesView({
  favoriteIds,
  allExercises,
  days,
  onToggleFavorite,
  onClearFavorites,
  onAddToPlan,
  onGoToPlanner,
}: FavoritesViewProps) {
  // Wybór dnia docelowego
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const favorites = allExercises.filter(e => favoriteIds.includes(e.id));

  const openPicker = (ids: string[]) => {
    setPendingIds(ids);
    setStatus(null);
    setPickerOpen(true);
  };

  const pickDay = (dayId: string) => {
    const day = days.find(d => d.id === dayId);
    onAddToPlan(dayId, pendingIds);
    setPickerOpen(false);
    const count = pendingIds.length;
    setStatus({
      ok: true,
      text: `Dodano ${count} ${count === 1 ? 'ćwiczenie' : 'ćwiczeń'} do: ${day?.name ?? ''}.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <StarIcon filled className="h-6 w-6 text-amber-300" />
            Ulubione ćwiczenia
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {favoriteIds.length === 0
              ? 'Zaznacz ćwiczenia w bibliotece, aby mieć je pod ręką'
              : `Zapisano ${favoriteIds.length} ${favoriteIds.length === 1 ? 'ćwiczenie' : 'ćwiczeń'}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {favorites.length > 0 && (
            <button
              onClick={() => openPicker(favorites.map(e => e.id))}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 text-white text-sm font-semibold shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] hover:brightness-110 transition-all cursor-pointer"
            >
              <PlusIcon className="h-4 w-4" />
              Dodaj do planu
            </button>
          )}
          {favorites.length > 0 && onClearFavorites && (
            <button
              onClick={() => { onClearFavorites(); setStatus({ ok: true, text: 'Wyczyszczono listę ulubionych.' }); }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-300 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Wyczyść
            </button>
          )}
        </div>
      </div>

      {/* Komunikat */}
      {status && (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            status.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {status.ok && <CheckIcon className="h-4 w-4 flex-shrink-0" />}
          {status.text}
        </p>
      )}

      {/* Lista */}
      {favorites.length === 0 ? (
        <div className="bg-white/[0.03] rounded-2xl border border-dashed border-cyan-400/30 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/30 to-cyan-400/10 text-cyan-200">
            <StarIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Brak ulubionych ćwiczeń</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Wejdź do zakładki „Ćwiczenia” i kliknij gwiazdkę przy ćwiczeniu, aby dodać je tutaj.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {favorites.map(ex => (
            <div
              key={ex.id}
              className="bg-white rounded-2xl border border-cyan-400/15 p-4 transition-colors hover:border-cyan-400/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug break-words">{ex.name}</p>
                  <span className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-600'}`}>
                    {ex.muscleGroup}
                  </span>
                </div>
                <button
                  onClick={() => onToggleFavorite(ex.id)}
                  aria-label={`Usuń ${ex.name} z ulubionych`}
                  title="Usuń z ulubionych"
                  className="flex-shrink-0 rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-400/15"
                >
                  <StarIcon filled className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                {ex.sets ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5">
                    <DumbbellIcon className="h-3 w-3" />
                    {ex.sets} serie
                  </span>
                ) : null}
                {ex.reps ? (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5">{ex.reps} powt.</span>
                ) : null}
                {ex.duration ? (
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5">{ex.duration} min</span>
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => openPicker([ex.id])}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition-all hover:bg-cyan-500/20 cursor-pointer"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Dodaj do planu
                </button>
                <button
                  onClick={onGoToPlanner}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/[0.07] cursor-pointer"
                >
                  Planer
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Wybór dnia docelowego ── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Wybierz dzień planu"
        >
          <div
            className="absolute inset-0 modal-overlay animate-fade-in"
            onClick={() => setPickerOpen(false)}
          />

          <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-cyan-400/20 bg-[#0c1733]/97 backdrop-blur-2xl shadow-2xl animate-sheet-up overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Wybierz dzień planu</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dodajemy {pendingIds.length}{' '}
                  {pendingIds.length === 1 ? 'ćwiczenie' : 'ćwiczeń'} do wybranego dnia.
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                aria-label="Zamknij"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300 transition-colors active:bg-white/10"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto overscroll-contain px-3 pb-3 space-y-1.5">
              {days.map(day => (
                <button
                  key={day.id}
                  onClick={() => pickDay(day.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition-all hover:border-cyan-400/40 hover:bg-white/[0.07] active:bg-white/[0.1] cursor-pointer"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-200">
                    <DumbbellIcon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{day.name}</span>
                    <span className="block text-[11px] text-slate-500">
                      {day.exercises.length === 0
                        ? 'Dzień pusty'
                        : `${day.exercises.length} ${day.exercises.length === 1 ? 'ćwiczenie' : 'ćwiczeń'}`}
                      {day.isRestDay && ' · odpoczynek'}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white">
                    <PlusIcon className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-cyan-400/10 px-5 py-3">
              <button
                onClick={() => setPickerOpen(false)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.07] cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
