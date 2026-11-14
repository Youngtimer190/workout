import { WorkoutDay } from '../types';
import { formatNumberPL, formatVolumePL, isDayCompleted, WorkoutStats } from '../lib/stats';
import { muscleGroupBgColors } from '../data/exercises';
import {
  ChartIcon,
  DumbbellIcon,
  FlameIcon,
  MoonIcon,
  SparklesIcon,
  TrophyIcon,
} from './icons';

interface DashboardProps {
  days: WorkoutDay[];
  /** Statystyki z historii tygodni (treningi w miesiącu, passa, wolumen). */
  stats?: WorkoutStats;
  onGoToPlanner: () => void;
  onGoToDay?: (dayIndex: number) => void;
}

const today = new Date().getDay();
const todayIndex = today === 0 ? 6 : today - 1;

/* ── Ikony (spójne z ekranem logowania) ─────────────────────────────────── */

export default function Dashboard({ days, stats, onGoToPlanner, onGoToDay }: DashboardProps) {
  const totalExercises = days.reduce((acc, d) => acc + (d.exercises?.length ?? 0), 0);
  const trainingDays = days.filter(d => !d.isRestDay && (d.exercises?.length ?? 0) > 0).length;

  // Tydzień zawsze ma 7 dni (patrz `normalizeWeekDays`), ale gdyby jednak
  // któregoś brakowało, nie wywalamy aplikacji — pokazujemy pusty dzień.
  const emptyDay = { name: '', exercises: [] as WorkoutDay['exercises'] };
  const todayDay = days[todayIndex] ?? emptyDay;
  const tomorrowDay = days[(todayIndex + 1) % 7] ?? emptyDay;

  const muscleGroupCount: Record<string, number> = {};
  days.forEach(d =>
    d.exercises.forEach(e => {
      muscleGroupCount[e.muscleGroup] = (muscleGroupCount[e.muscleGroup] || 0) + 1;
    })
  );
  const topMuscles = Object.entries(muscleGroupCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Górny wiersz: twarde liczby z historii treningów.
  const monthWorkouts = stats?.monthWorkouts ?? 0;
  const streakWeeks = stats?.streakWeeks ?? 0;
  const weekVolume = stats?.weekVolume ?? 0;
  const totalVolume = stats?.totalVolume ?? 0;
  const totalCardioMinutes = stats?.totalCardioMinutes ?? 0;
  const monthLabel = stats?.monthLabel ?? '';

  /**
   * Wykonane dni w bieżącym tygodniu (z planu zaplanowanych dni treningowych).
   *
   * Passa mówi „ćwiczyłeś co tydzień”, ale sama nie mówi, ile NAPRAWDĘ
   * zrobiłeś. Ten podpis uzupełnia tę informację — bez niego wyglądałoby,
   * że tydzień z jednym treningiem jest taki sam jak tydzień pełny.
   */
  const weekTrainingDays = days.filter(d => (d.exercises?.length ?? 0) > 0).length;
  const weekCompletedDays = days.filter(isDayCompleted).length;

  /**
   * Kafelki statystyk — jeden wspólny wzór:
   * duża liczba, pod nią nazwa z dwukropkiem („Treningi w miesiącu: listopad”).
   */
  const statCards = [
    {
      label: 'Dni treningowe: ten tydzień',
      value: trainingDays,
      icon: <DumbbellIcon />,
    },
    {
      label: monthLabel ? `Treningi w miesiącu: ${monthLabel}` : 'Treningi w miesiącu',
      value: monthWorkouts,
      icon: <TrophyIcon />,
    },
    {
      label: 'Ćwiczysz już: tygodnie z rzędu',
      value: streakWeeks,
      icon: <FlameIcon />,
      extra: weekTrainingDays > 0 ? `w tym tygodniu ${weekCompletedDays} z ${weekTrainingDays} dni` : undefined,
    },
    {
      label: 'Wolumen: 7 dni (kg)',
      value: formatNumberPL(weekVolume),
      icon: <ChartIcon />,
      sub: totalCardioMinutes > 0
        ? `Łącznie: ${formatVolumePL(totalVolume)} · ${formatNumberPL(totalCardioMinutes)} min cardio`
        : `Łącznie: ${formatVolumePL(totalVolume)}`,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Witaj!
            <SparklesIcon className="h-6 w-6 text-violet-300" />
          </h1>
          <p className="text-slate-400 text-sm mt-1">Oto przegląd Twojego planu treningowego</p>
        </div>
        <button
          onClick={onGoToPlanner}
          className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white text-sm font-semibold shadow-[0_14px_34px_-14px_rgba(139,92,246,1)] hover:brightness-110 transition-all cursor-pointer self-start sm:self-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Edytuj plan
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:translate-x-1">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-4 border border-violet-400/15 hover:border-violet-400/30 transition-colors flex flex-col"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/25 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10 text-violet-200 mb-3">
              {stat.icon}
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">{stat.value}</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">{stat.label}</p>
            {stat.sub && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{stat.sub}</p>}
            {stat.extra && (
              <p className="text-[11px] sm:text-xs text-violet-300/80 mt-0.5">{stat.extra}</p>
            )}
          </div>
        ))}
      </div>

      {/* Today & Tomorrow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DayCard
          day={todayDay}
          label="Dziś"
          isToday
          onClick={onGoToDay ? () => onGoToDay(todayIndex) : undefined}
          clickable={!!onGoToDay}
        />
        <DayCard
          day={tomorrowDay}
          label="Jutro"
          onClick={onGoToDay ? () => onGoToDay((todayIndex + 1) % 7) : undefined}
          clickable={!!onGoToDay}
        />
      </div>

      {/* Week Overview */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-violet-400/15">
        <h2 className="text-base font-bold text-white mb-4">Plan tygodnia</h2>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            return (
              <div
                key={day.id}
                onClick={onGoToDay ? () => onGoToDay(i) : undefined}
                className={`flex flex-col items-center gap-1 sm:gap-1.5 ${onGoToDay ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
                title={onGoToDay ? 'Kliknij, aby przejść do planera' : undefined}
              >
                <span className={`text-[10px] sm:text-xs font-semibold ${isToday ? 'text-violet-300' : 'text-slate-500'}`}>
                  {day.name.substring(0, 2)}
                </span>
                <div
                  className={`w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isToday
                      ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-[0_10px_24px_-12px_rgba(139,92,246,1)]'
                      : day.isRestDay
                      ? 'bg-white/[0.05] text-slate-500'
                      : day.exercises.length > 0
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'
                      : 'bg-white/[0.03] text-slate-600 border border-white/5'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs">
                    {day.isRestDay ? (
                      <MoonIcon className="mx-auto h-4 w-4" />
                    ) : day.exercises.length > 0 ? (
                      day.exercises.length
                    ) : (
                      '–'
                    )}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-500 text-center leading-tight">
                  {day.isRestDay ? 'Odp.' : day.exercises.length > 0 ? `${day.exercises.length} ćw.` : 'Pusty'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Muscle Distribution */}
      {topMuscles.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-violet-400/15">
          <h2 className="text-base font-bold text-white mb-4">Najczęściej trenowane partie</h2>
          <div className="space-y-2.5">
            {topMuscles.map(([muscle, count]) => {
              const max = topMuscles[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <div key={muscle} className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${muscleGroupBgColors[muscle] || 'bg-slate-100 text-slate-600'}`}>
                    {muscle}
                  </span>
                  <div className="flex-1 h-2 bg-white/[0.07] rounded-full overflow-hidden min-w-0">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-300 w-5 text-right flex-shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalExercises === 0 && (
        <div className="bg-white/[0.03] rounded-2xl p-8 sm:p-10 border border-dashed border-violet-400/30 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/10 text-violet-200 mb-4">
            <DumbbellIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Zacznij planować!</h3>
          <p className="text-slate-400 text-sm mb-5">Twój plan treningowy jest pusty. Przejdź do planera i dodaj pierwsze ćwiczenia.</p>
          <button
            onClick={onGoToPlanner}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white font-semibold shadow-[0_14px_34px_-14px_rgba(139,92,246,1)] hover:brightness-110 transition-all cursor-pointer text-sm"
          >
            Otwórz planer
          </button>
        </div>
      )}
    </div>
  );
}

function DayCard({ day, label, isToday, onClick, clickable }: { day: WorkoutDay; label: string; isToday?: boolean; onClick?: () => void; clickable?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 sm:p-5 border backdrop-blur-xl transition-all ${
        isToday
          ? 'border-violet-400/40 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/5 shadow-[0_20px_50px_-30px_rgba(139,92,246,0.9)]'
          : 'border-violet-400/15 bg-white'
      } ${clickable ? 'cursor-pointer hover:border-violet-400/35 hover:scale-[1.01]' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-violet-300' : 'text-slate-500'}`}>
            {label}
          </span>
          <p className="text-base font-bold text-white">{day.name}</p>
        </div>
        {day.isRestDay ? (
          <span className="px-2.5 py-1 bg-white/[0.07] text-slate-400 text-xs font-semibold rounded-full">Odpoczynek</span>
        ) : (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isToday ? 'bg-violet-500/25 text-violet-200 border border-violet-400/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'}`}>
            {day.exercises.length} ćwiczeń
          </span>
        )}
      </div>
      {!day.isRestDay && day.exercises.length > 0 ? (
        <ul className="space-y-1.5 mt-2">
          {day.exercises.slice(0, 4).map(ex => (
            <li key={ex.id} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">{ex.name}</span>
              {ex.sets && <span className="ml-auto text-xs text-slate-500 flex-shrink-0">{ex.sets}×{ex.reps}</span>}
            </li>
          ))}
          {day.exercises.length > 4 && (
            <li className="text-xs text-slate-500 pl-3.5">+{day.exercises.length - 4} więcej...</li>
          )}
        </ul>
      ) : day.isRestDay ? (
        <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-2">
          <MoonIcon className="h-4 w-4" />
          Czas na regenerację
        </p>
      ) : (
        <p className="text-sm text-slate-400 mt-2">Brak zaplanowanych ćwiczeń</p>
      )}
    </div>
  );
}
