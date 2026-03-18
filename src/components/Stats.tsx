import { WorkoutDay } from '../types';
import { muscleGroupBgColors, muscleGroupColors } from '../data/exercises';

interface StatsProps {
  days: WorkoutDay[];
}

const difficultyBg: Record<string, string> = {
  'Początkujący': 'bg-emerald-100 text-emerald-700',
  'Średniozaawansowany': 'bg-amber-100 text-amber-700',
  'Zaawansowany': 'bg-red-100 text-red-700',
};

export default function Stats({ days }: StatsProps) {
  const allExercises = days.flatMap(d => d.exercises);
  const trainingDays = days.filter(d => !d.isRestDay && d.exercises.length > 0);
  const restDays = days.filter(d => d.isRestDay);

  const totalSets = allExercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const totalCardioMin = allExercises
    .filter(e => e.muscleGroup === 'Cardio')
    .reduce((acc, e) => acc + (e.duration || 0), 0);

  const muscleCount: Record<string, number> = {};
  allExercises.forEach(e => {
    muscleCount[e.muscleGroup] = (muscleCount[e.muscleGroup] || 0) + 1;
  });
  const sortedMuscles = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]);
  const maxMusCount = sortedMuscles[0]?.[1] || 1;

  const difficultyCount: Record<string, number> = {};
  allExercises.forEach(e => {
    difficultyCount[e.difficulty] = (difficultyCount[e.difficulty] || 0) + 1;
  });

  const avgExercisesPerDay = trainingDays.length
    ? (allExercises.length / trainingDays.length).toFixed(1)
    : '0';

  const workloadScore = totalSets * 10 + allExercises.length * 5 + totalCardioMin * 2;

  const getWorkloadLabel = (score: number) => {
    if (score === 0) return { label: 'Brak planu', color: 'text-slate-400', emoji: '—' };
    if (score < 100) return { label: 'Lekki', color: 'text-emerald-600', emoji: '😌' };
    if (score < 250) return { label: 'Umiarkowany', color: 'text-amber-600', emoji: '💪' };
    if (score < 450) return { label: 'Intensywny', color: 'text-orange-600', emoji: '🔥' };
    return { label: 'Ekstremalny', color: 'text-red-600', emoji: '⚡' };
  };

  const workload = getWorkloadLabel(workloadScore);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Statystyki</h1>
        <p className="text-slate-500 text-sm mt-0.5">Analiza Twojego planu treningowego</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Dni treningowe', value: trainingDays.length, sub: `z 7 dni`, emoji: '🏋️', color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Ćwiczenia', value: allExercises.length, sub: `~${avgExercisesPerDay} / dzień`, emoji: '💪', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Serie łącznie', value: totalSets, sub: 'w całym tygodniu', emoji: '🔁', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Cardio', value: `${totalCardioMin}`, sub: 'minut w tygodniu', emoji: '🏃', color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-lg mb-2.5`}>{s.emoji}</div>
            <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">{s.label}</p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Workload & Rest balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Workload */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Poziom obciążenia</h2>
          <div className="flex items-center gap-4">
            <div className="text-5xl">{workload.emoji}</div>
            <div>
              <p className={`text-2xl font-bold ${workload.color}`}>{workload.label}</p>
              <p className="text-sm text-slate-500 mt-1">Wynik: {workloadScore} pkt</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-700"
                style={{ width: `${Math.min((workloadScore / 600) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Lekki</span>
              <span>Umiarkowany</span>
              <span>Ekstremalny</span>
            </div>
          </div>
        </div>

        {/* Training/Rest balance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Balans trening / odpoczynek</h2>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-violet-600 font-semibold">Trening</span>
                <span className="text-slate-500">{trainingDays.length}/7</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all"
                  style={{ width: `${(trainingDays.length / 7) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500 font-semibold">Odpoczynek</span>
                <span className="text-slate-400">{restDays.length}/7</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full transition-all"
                  style={{ width: `${(restDays.length / 7) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            {trainingDays.length >= 5
              ? '⚠️ Rozważ więcej dni odpoczynku dla lepszej regeneracji.'
              : trainingDays.length === 0
              ? '📅 Dodaj treningi do swojego planu.'
              : '✅ Dobry balans treningów i odpoczynku!'}
          </p>
        </div>
      </div>

      {/* Muscle group distribution */}
      {sortedMuscles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Rozkład grup mięśniowych</h2>
          <div className="space-y-2.5">
            {sortedMuscles.map(([muscle, count]) => {
              const pct = Math.round((count / maxMusCount) * 100);
              return (
                <div key={muscle} className="flex items-center gap-2 sm:gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${muscleGroupBgColors[muscle] || 'bg-slate-100 text-slate-600'}`}>
                    {muscle}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${muscleGroupColors[muscle] || 'from-slate-400 to-slate-500'} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-600 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Difficulty breakdown */}
      {allExercises.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-base font-bold text-slate-800 mb-4">Poziom trudności ćwiczeń</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {['Początkujący', 'Średniozaawansowany', 'Zaawansowany'].map(d => {
              const cnt = difficultyCount[d] || 0;
              const pct = allExercises.length ? Math.round((cnt / allExercises.length) * 100) : 0;
              return (
                <div key={d} className={`rounded-xl p-3 sm:p-4 text-center ${difficultyBg[d]} bg-opacity-50`}>
                  <p className="text-xl sm:text-2xl font-bold">{cnt}</p>
                  <p className="text-[10px] sm:text-xs font-semibold mt-1 opacity-80 leading-tight">{d}</p>
                  <p className="text-xs opacity-60 mt-0.5">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {allExercises.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Brak danych</h3>
          <p className="text-slate-400">Dodaj ćwiczenia do swojego planu, aby zobaczyć statystyki.</p>
        </div>
      )}
    </div>
  );
}
