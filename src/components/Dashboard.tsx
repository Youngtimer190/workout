import { WorkoutDay } from '../types';
import { muscleGroupBgColors } from '../data/exercises';

interface DashboardProps {
  days: WorkoutDay[];
  onGoToPlanner: () => void;
}

const today = new Date().getDay();
const todayIndex = today === 0 ? 6 : today - 1;

export default function Dashboard({ days, onGoToPlanner }: DashboardProps) {
  const totalExercises = days.reduce((acc, d) => acc + d.exercises.length, 0);
  const trainingDays = days.filter(d => !d.isRestDay && d.exercises.length > 0).length;
  const restDays = days.filter(d => d.isRestDay).length;
  const totalSets = days.reduce((acc, d) => acc + d.exercises.reduce((a, e) => a + (e.sets || 0), 0), 0);

  const todayDay = days[todayIndex];
  const tomorrowDay = days[(todayIndex + 1) % 7];

  const muscleGroupCount: Record<string, number> = {};
  days.forEach(d =>
    d.exercises.forEach(e => {
      muscleGroupCount[e.muscleGroup] = (muscleGroupCount[e.muscleGroup] || 0) + 1;
    })
  );
  const topMuscles = Object.entries(muscleGroupCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const stats = [
    { label: 'Dni treningowe', value: trainingDays, icon: '🏋️', color: 'from-violet-500 to-indigo-600', bg: 'bg-violet-50', textColor: 'text-violet-600' },
    { label: 'Ćwiczenia', value: totalExercises, icon: '💪', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', textColor: 'text-emerald-600' },
    { label: 'Serie', value: totalSets, icon: '🔥', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', textColor: 'text-amber-600' },
    { label: 'Odpoczynek', value: restDays, icon: '😴', color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', textColor: 'text-sky-600' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Witaj! 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">Oto przegląd Twojego planu treningowego</p>
        </div>
        <button
          onClick={onGoToPlanner}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02] transition-all cursor-pointer self-start sm:self-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Edytuj plan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center text-lg mb-2.5`}>
              {stat.icon}
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Today & Tomorrow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DayCard day={todayDay} label="Dziś" isToday />
        <DayCard day={tomorrowDay} label="Jutro" />
      </div>

      {/* Week Overview */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
        <h2 className="text-base font-bold text-slate-800 mb-4">Plan tygodnia</h2>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            return (
              <div key={day.id} className="flex flex-col items-center gap-1 sm:gap-1.5">
                <span className={`text-[10px] sm:text-xs font-semibold ${isToday ? 'text-violet-600' : 'text-slate-400'}`}>
                  {day.name.substring(0, 2)}
                </span>
                <div
                  className={`w-full aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isToday
                      ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-200'
                      : day.isRestDay
                      ? 'bg-slate-100 text-slate-400'
                      : day.exercises.length > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-50 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] sm:text-xs">
                    {day.isRestDay ? '😴' : day.exercises.length > 0 ? day.exercises.length : '–'}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 text-center leading-tight">
                  {day.isRestDay ? 'Odp.' : day.exercises.length > 0 ? `${day.exercises.length} ćw.` : 'Pusty'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Muscle Distribution */}
      {topMuscles.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-bold text-slate-800 mb-4">Najczęściej trenowane partie</h2>
          <div className="space-y-2.5">
            {topMuscles.map(([muscle, count]) => {
              const max = topMuscles[0][1];
              const pct = Math.round((count / max) * 100);
              return (
                <div key={muscle} className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${muscleGroupBgColors[muscle] || 'bg-slate-100 text-slate-600'}`}>
                    {muscle}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-0">
                    <div
                      className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-600 w-5 text-right flex-shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalExercises === 0 && (
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-dashed border-slate-200 text-center">
          <div className="text-5xl mb-3">🏋️‍♂️</div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Zacznij planować!</h3>
          <p className="text-slate-400 text-sm mb-5">Twój plan treningowy jest pusty. Przejdź do planera i dodaj pierwsze ćwiczenia.</p>
          <button
            onClick={onGoToPlanner}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all cursor-pointer text-sm"
          >
            Otwórz planer
          </button>
        </div>
      )}
    </div>
  );
}

function DayCard({ day, label, isToday }: { day: WorkoutDay; label: string; isToday?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 border ${isToday ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-violet-500' : 'text-slate-400'}`}>
            {label}
          </span>
          <p className="text-base font-bold text-slate-800">{day.name}</p>
        </div>
        {day.isRestDay ? (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">Odpoczynek</span>
        ) : (
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${isToday ? 'bg-violet-200 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {day.exercises.length} ćwiczeń
          </span>
        )}
      </div>
      {!day.isRestDay && day.exercises.length > 0 ? (
        <ul className="space-y-1.5 mt-2">
          {day.exercises.slice(0, 4).map(ex => (
            <li key={ex.id} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">{ex.name}</span>
              {ex.sets && <span className="ml-auto text-xs text-slate-400 flex-shrink-0">{ex.sets}×{ex.reps}</span>}
            </li>
          ))}
          {day.exercises.length > 4 && (
            <li className="text-xs text-slate-400 pl-3.5">+{day.exercises.length - 4} więcej...</li>
          )}
        </ul>
      ) : day.isRestDay ? (
        <p className="text-sm text-slate-400 mt-2">Czas na regenerację 💤</p>
      ) : (
        <p className="text-sm text-slate-400 mt-2">Brak zaplanowanych ćwiczeń</p>
      )}
    </div>
  );
}
