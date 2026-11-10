import { Exercise } from '../types';
import { muscleGroupBgColors } from '../data/exercises';
import { ChevronRightIcon, DumbbellIcon, StarIcon } from './icons';

interface FavoritesViewProps {
  /** Identyfikatory ulubionych ćwiczeń. */
  favoriteIds: string[];
  /** Wszystkie dostępne ćwiczenia (biblioteka + własne) — po `id`. */
  allExercises: Exercise[];
  onToggleFavorite: (id: string) => void;
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
  onToggleFavorite,
  onGoToPlanner,
}: FavoritesViewProps) {
  const favorites = allExercises.filter(e => favoriteIds.includes(e.id));

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
        <button
          onClick={onGoToPlanner}
          className="group inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white text-sm font-semibold shadow-[0_14px_34px_-14px_rgba(139,92,246,1)] hover:brightness-110 transition-all cursor-pointer"
        >
          Dodaj do planu
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Lista */}
      {favorites.length === 0 ? (
        <div className="bg-white/[0.03] rounded-2xl border border-dashed border-violet-400/30 p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10 text-violet-200">
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
              className="bg-white rounded-2xl border border-violet-400/15 p-4 transition-colors hover:border-violet-400/30"
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
                  className="flex-shrink-0 rounded-lg p-1.5 text-amber-300 transition-colors hover:bg-amber-400/10"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
