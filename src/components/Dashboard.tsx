import { WorkoutDay } from '../types';
import {
  DashboardHistory,
  formatNumberPL,
  formatVolumePL,
  isDayCompleted,
  WorkoutStats,
} from '../lib/stats';
import { muscleGroupBgColors } from '../data/exercises';
import { pluralPl } from '../lib/format';
import StatCard from './StatCard';
import WeekPlanPanel from './WeekPlanPanel';
import {
  CalendarIcon,
  ChartIcon,
  DumbbellIcon,
  FlameIcon,
  MoonIcon,
} from './icons';

interface DashboardProps {
  days: WorkoutDay[];
  /** Klucz bieżącego tygodnia — potrzebny do dat w „Plan tygodnia". */
  weekKey?: string | null;
  /** Statystyki z historii tygodni (treningi w miesiącu, passa, wolumen). */
  stats?: WorkoutStats;
  /** Historia do porównań i mini-wykresów w górnej sekcji. */
  history?: DashboardHistory;
  /** Imię użytkownika — do powitania. */
  displayName?: string | null;
  onGoToPlanner: () => void;
  onGoToDay?: (dayIndex: number) => void;
}

const today = new Date().getDay();
const todayIndex = today === 0 ? 6 : today - 1;

/** Pełna data po polsku, np. „poniedziałek, 16 listopada 2026". */
function formatTodayPL(date: Date): string {
  const s = new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Ikony (spójne z ekranem logowania) ─────────────────────────────────── */

export default function Dashboard({
  days,
  weekKey,
  stats,
  history,
  displayName,
  onGoToPlanner,
  onGoToDay,
}: DashboardProps) {
  const totalExercises = days.reduce((acc, d) => acc + (d.exercises?.length ?? 0), 0);

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

  /* ── Powitanie i podpis ────────────────────────────────────────────────── */

  const imie = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  const powitanie = imie ? `Witaj, ${imie}` : 'Witaj!';

  const maPlan = totalExercises > 0;
  const dzisJuzTrenowano = isDayCompleted(days[todayIndex] ?? emptyDay);
  const podpis = !maPlan
    ? 'Twój plan jest pusty — zacznij od jednego ćwiczenia.'
    : !dzisJuzTrenowano && (days[todayIndex]?.exercises?.length ?? 0) > 0
    ? 'Zacznij dziś od jednej serii — każda się liczy.'
    : 'Regularność buduje formę. Trenuj konsekwentnie!';

  const etykietaCTA = maPlan ? 'Edytuj plan' : 'Zaplanuj trening';

  /* ── Karty statystyk ──────────────────────────────────────────────────────
     Każda karta ma: ikonę + etykietę, wartość, podpis oraz porównanie
     z poprzednim okresem i mini-wykres. */

  const hist = history;

  /** Zmiana względem poprzedniego okresu (liczba albo procent). */
  const zmiana = (obecna: number, poprzednia: number, procent: boolean): number | null => {
    if (procent) {
      if (poprzednia <= 0) return null;
      return Math.round(((obecna - poprzednia) / poprzednia) * 100);
    }
    return obecna - poprzednia;
  };

  const karty = [
    {
      ikona: <CalendarIcon className="h-4 w-4" />,
      etykieta: 'Treningi w tym miesiącu',
      wartosc: monthWorkouts,
      podpis: monthLabel,
      delta: {
        change: hist ? zmiana(hist.monthWorkouts, hist.previousMonth.workouts, false) : null,
        hasBaseline: hist?.previousMonth.exists ?? false,
        period: 'poprzedni miesiąc',
      },
      seria: hist?.series.workouts,
    },
    {
      ikona: <DumbbellIcon className="h-4 w-4" />,
      etykieta: 'Wykonane ćwiczenia',
      wartosc: hist?.weekExercises ?? 0,
      podpis: 'w tym tygodniu',
      delta: {
        change: hist ? zmiana(hist.weekExercises, hist.previousWeek.exercises, false) : null,
        hasBaseline: hist?.previousWeek.exists ?? false,
        period: 'poprzedni tydzień',
      },
      seria: hist?.series.exercises,
      wyróżniona: true,
    },
    {
      ikona: <FlameIcon className="h-4 w-4" />,
      etykieta: 'Dni z rzędu',
      wartosc: hist?.dailyStreak ?? 0,
      jednostka: ` ${pluralPl(hist?.dailyStreak ?? 0, 'dzień', 'dni', 'dni')}`,
      podpis: `${pluralPl(streakWeeks, 'tydzień', 'tygodnie', 'tygodni')} z rzędu`,
      seria: hist?.series.streak,
      typSerii: 'line' as const,
    },
    {
      ikona: <ChartIcon className="h-4 w-4" />,
      etykieta: 'Objętość treningowa',
      wartosc: formatNumberPL(weekVolume),
      jednostka: ' kg',
      podpis: totalCardioMinutes > 0
        ? `Łącznie: ${formatVolumePL(totalVolume)} · ${formatNumberPL(totalCardioMinutes)} min cardio`
        : `Łącznie: ${formatVolumePL(totalVolume)}`,
      delta: {
        change: hist ? zmiana(weekVolume, hist.previousWeek.volume, true) : null,
        hasBaseline: hist?.previousWeek.exists ?? false,
        period: 'poprzedni tydzień',
        percent: true,
        unit: 'kg',
      },
      seria: hist?.series.volume,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header
          Poziomy układ (chip z datą obok tytułu) włącza się dopiero od
          `lg` — przy mniejszych szerokościach panel boczny zjada miejsce
          i tytuł zawijałby się na cztery linie. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {powitanie}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{podpis}</p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:justify-end">
          {/* Data dzisiejsza — chip z ikoną kalendarza */}
          <span className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-slate-300 sm:text-xs">
            <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
            <span className="truncate">{formatTodayPL(new Date())}</span>
          </span>
          <button
            onClick={onGoToPlanner}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] transition-all hover:brightness-110 active:opacity-90 cursor-pointer"
          >
            {maPlan ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
            {etykietaCTA}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:translate-x-1">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {karty.map(k => (
          <StatCard
            key={k.etykieta}
            icon={k.ikona}
            label={k.etykieta}
            value={k.wartosc}
            suffix={k.jednostka}
            sub={k.podpis}
            delta={k.delta}
            series={k.seria}
            seriesType={k.typSerii}
            highlighted={k.wyróżniona}
          />
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
      <WeekPlanPanel
        days={days}
        weekKey={weekKey}
        todayIndex={todayIndex}
        onGoToDay={onGoToDay}
      />

      {/* Muscle Distribution */}
      {topMuscles.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-cyan-400/15">
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
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700"
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
        <div className="bg-white/[0.03] rounded-2xl p-8 sm:p-10 border border-dashed border-cyan-400/30 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-200 mb-4">
            <DumbbellIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Zacznij planować!</h3>
          <p className="text-slate-400 text-sm mb-5">Twój plan treningowy jest pusty. Przejdź do planera i dodaj pierwsze ćwiczenia.</p>
          <button
            onClick={onGoToPlanner}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-700 text-white font-semibold shadow-[0_14px_34px_-14px_rgba(6,182,212,1)] hover:brightness-110 transition-all cursor-pointer text-sm"
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
          ? 'border-cyan-400/40 bg-gradient-to-br from-cyan-500/15 to-cyan-400/5 shadow-[0_20px_50px_-30px_rgba(6,182,212,0.9)]'
          : 'border-cyan-400/15 bg-white'
      } ${clickable ? 'cursor-pointer hover:border-cyan-400/35 hover:scale-[1.01]' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-cyan-300' : 'text-slate-500'}`}>
            {label}
          </span>
          <p className="text-base font-bold text-white">{day.name}</p>
        </div>
        {day.isRestDay ? (
          <span className="px-2.5 py-1 bg-white/[0.07] text-slate-400 text-xs font-semibold rounded-full">Odpoczynek</span>
        ) : (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isToday ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'}`}>
            {day.exercises.length} ćwiczeń
          </span>
        )}
      </div>
      {!day.isRestDay && day.exercises.length > 0 ? (
        <ul className="space-y-1.5 mt-2">
          {day.exercises.slice(0, 4).map(ex => (
            <li key={ex.id} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
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
