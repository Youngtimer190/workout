import { useState } from 'react';
import { GeneratedPlan, WorkoutDay } from '../../types';
import { muscleGroupBgColors } from '../../data/exercises';

interface Props {
  plan: GeneratedPlan;
  onApply: () => void;
  onRegenerate: () => void;
}

const goalLabels: Record<string, { label: string; color: string; emoji: string }> = {
  muscle_gain: { label: 'Budowa masy', color: 'from-violet-500 to-purple-600', emoji: '💪' },
  fat_loss: { label: 'Redukcja', color: 'from-orange-500 to-red-600', emoji: '🔥' },
  strength: { label: 'Siła', color: 'from-blue-500 to-indigo-600', emoji: '🏋️' },
  endurance: { label: 'Wytrzymałość', color: 'from-emerald-500 to-teal-600', emoji: '🏃' },
  general_fitness: { label: 'Ogólna sprawność', color: 'from-amber-500 to-yellow-600', emoji: '⚡' },
};

const levelColors: Record<string, string> = {
  beginner: 'bg-green-400/30 text-white',
  intermediate: 'bg-blue-400/30 text-white',
  advanced: 'bg-red-400/30 text-white',
};
const levelLabels: Record<string, string> = {
  beginner: '🌱 Początkujący',
  intermediate: '⚙️ Średniozaawansowany',
  advanced: '🚀 Zaawansowany',
};

// Skraca notatki trenera do pierwszego zdania w podglądzie
function shortNote(note?: string): string | null {
  if (!note) return null;
  const trainerIdx = note.indexOf('💡 TRENER:');
  if (trainerIdx !== -1) return note.substring(0, trainerIdx).trim() || null;
  const firstSentence = note.split('.')[0];
  return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '…' : firstSentence;
}

// Zwraca label nazwy dnia z podziałem (zapisany w exercise notes lub jako pole na WorkoutDay)
function getDayLabel(day: WorkoutDay): string | null {
  // Szukamy notatki z generatora (pole notes) lub w typie rozszerzonym
  const extended = day as WorkoutDay & { notes?: string };
  return extended.notes || null;
}

function DayCard({ day }: { day: WorkoutDay }) {
  if (day.isRestDay) {
    return (
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[100px] gap-1">
        <span className="text-2xl">🌙</span>
        <p className="text-sm font-medium text-slate-400">{day.name}</p>
        <p className="text-xs text-slate-300">Odpoczynek / Regeneracja</p>
      </div>
    );
  }

  const label = getDayLabel(day);
  const mainExercises = day.exercises.filter(e => e.muscleGroup !== 'Cardio' || !e.name.includes('Rozgrzewka'));

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${day.color} mb-2`}>
        <span className="text-xs font-bold text-white">{day.name}</span>
      </div>
      {label && (
        <p className="text-xs font-semibold text-slate-500 mb-2 truncate" title={label}>
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {mainExercises.slice(0, 5).map(ex => (
          <div key={ex.id} className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-600'}`}>
              {ex.muscleGroup}
            </span>
            <span className="text-xs text-slate-700 font-medium truncate flex-1">{ex.name}</span>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {ex.duration ? `${ex.duration} min` : `${ex.sets}×${ex.reps}`}
            </span>
          </div>
        ))}
        {mainExercises.length > 5 && (
          <p className="text-xs text-slate-400 pt-1">+{mainExercises.length - 5} więcej ćwiczeń…</p>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
        <span>💪 {mainExercises.length} ćw.</span>
        <span>📊 {day.exercises.reduce((s, e) => s + (e.sets || 0), 0)} serii</span>
        <span>⏱ ~{Math.round(day.exercises.reduce((s, e) => s + (e.duration || ((e.sets || 3) * 2.5 + ((e.restTime || 60) / 60) * ((e.sets || 3) - 1))), 0))} min</span>
      </div>
    </div>
  );
}

function ExerciseRow({ ex, idx }: { ex: GeneratedPlan['days'][0]['exercises'][0]; idx: number }) {
  const [showFullNote, setShowFullNote] = useState(false);
  const trainerNote = ex.notes?.includes('💡 TRENER:') ? ex.notes.split('💡 TRENER:')[1]?.trim() : null;
  const mainNote = shortNote(ex.notes);
  const isWarmup = ex.name.includes('Rozgrzewka');

  return (
    <div className={`px-4 py-3 flex items-start gap-3 ${isWarmup ? 'bg-orange-50/50' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${isWarmup ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
        {isWarmup ? '🔥' : idx + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-semibold text-sm ${isWarmup ? 'text-orange-700' : 'text-slate-800'}`}>{ex.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${muscleGroupBgColors[ex.muscleGroup] || 'bg-slate-100 text-slate-600'}`}>
            {ex.muscleGroup}
          </span>
          {ex.difficulty && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              ex.difficulty === 'Zaawansowany' ? 'bg-red-100 text-red-600' :
              ex.difficulty === 'Średniozaawansowany' ? 'bg-amber-100 text-amber-600' :
              'bg-green-100 text-green-600'
            }`}>
              {ex.difficulty}
            </span>
          )}
        </div>

        {/* Wskazówka techniczna */}
        {mainNote && !isWarmup && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mainNote}</p>
        )}
        {isWarmup && ex.notes && (
          <p className="text-xs text-orange-600/80 mt-1 leading-relaxed">{ex.notes}</p>
        )}

        {/* Wskazówka trenera (rozwijana) */}
        {trainerNote && (
          <div className="mt-1.5">
            {showFullNote ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-xs text-indigo-700 leading-relaxed">
                <span className="font-semibold">💡 Wskazówka trenera: </span>{trainerNote}
                <button onClick={() => setShowFullNote(false)} className="ml-2 text-indigo-400 hover:text-indigo-600 underline cursor-pointer">zwiń</button>
              </div>
            ) : (
              <button
                onClick={() => setShowFullNote(true)}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                💡 Wskazówka trenera
              </button>
            )}
          </div>
        )}
      </div>

      {/* Parametry po prawej */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {ex.duration ? (
          <span className="bg-sky-50 text-sky-600 px-2 py-1 rounded-lg font-semibold text-xs">{ex.duration} min</span>
        ) : (
          <>
            <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded-lg font-bold text-xs">{ex.sets} serie</span>
            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-medium text-xs">{ex.reps} powt.</span>
          </>
        )}
        {ex.restTime ? (
          <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-xs">{ex.restTime > 60 ? `${Math.round(ex.restTime / 60)} min` : `${ex.restTime}s`} prz.</span>
        ) : null}
      </div>
    </div>
  );
}

export default function GeneratorStep3({ plan, onApply, onRegenerate }: Props) {
  const goalMeta = goalLabels[plan.goal] || goalLabels.general_fitness;
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const trainingDays = plan.days.filter(d => !d.isRestDay);
  const totalSets = plan.days.reduce((s, d) => s + d.exercises.reduce((ss, e) => ss + (e.sets || 0), 0), 0);
  const totalExercises = plan.days.reduce((s, d) => s + d.exercises.filter(e => !e.name.includes('Rozgrzewka')).length, 0);

  // Wyciągnij krótki i długi opis
  const descParts = plan.description.split('\n\n');
  const shortDesc = descParts[0] ? descParts[0].substring(0, 160) + (descParts[0].length > 160 ? '…' : '') : '';
  const fullDesc = plan.description;

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className={`bg-gradient-to-br ${goalMeta.color} rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden`}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-4xl">{goalMeta.emoji}</span>
            <div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${levelColors[plan.fitnessLevel]}`}>
                {levelLabels[plan.fitnessLevel]}
              </span>
              <h2 className="text-base sm:text-lg font-bold leading-tight mt-1.5">{plan.name}</h2>
            </div>
          </div>

          {/* Opis — skrócony z rozwijaniem */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
              {descriptionExpanded ? fullDesc : shortDesc}
            </p>
            {fullDesc.length > 160 && (
              <button
                onClick={() => setDescriptionExpanded(p => !p)}
                className="text-xs text-white/60 hover:text-white mt-1 underline cursor-pointer"
              >
                {descriptionExpanded ? 'Zwiń' : 'Czytaj więcej →'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Dni', value: plan.daysPerWeek, icon: '📅' },
              { label: 'Ćwiczenia', value: totalExercises, icon: '🏋️' },
              { label: 'Serie', value: totalSets, icon: '📊' },
              { label: 'kcal/tydz.', value: `~${plan.estimatedCalories}`, icon: '🔥' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/20 backdrop-blur-sm rounded-xl p-2 sm:p-3 text-center">
                <div className="text-base sm:text-lg">{stat.icon}</div>
                <div className="text-sm sm:text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-white/70 hidden sm:block">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tygodniowy przegląd */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">📅 Plan tygodniowy</h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {trainingDays.length} treningów · {7 - trainingDays.length} odpoczynku
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {plan.days.map(day => (
            <DayCard key={day.id} day={day} />
          ))}
        </div>
      </div>

      {/* Szczegóły treningów */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">📋 Szczegóły treningów</h3>
        <div className="space-y-4">
          {trainingDays.map(day => {
            const label = getDayLabel(day);
            const sessionTime = Math.round(
              day.exercises.reduce((s, e) => s + (e.duration || ((e.sets || 3) * 2.5 + ((e.restTime || 60) / 60) * ((e.sets || 3) - 1))), 0)
            );
            return (
              <div key={day.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Nagłówek dnia */}
                <div className={`bg-gradient-to-r ${day.color} px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{day.name}</h4>
                      {label && <p className="text-white/70 text-xs mt-0.5">{label}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-white/80 text-xs">
                      <span className="bg-white/20 px-2 py-1 rounded-lg">💪 {day.exercises.filter(e => !e.name.includes('Rozgrzewka')).length} ćw.</span>
                      <span className="bg-white/20 px-2 py-1 rounded-lg">⏱ ~{sessionTime} min</span>
                    </div>
                  </div>

                  {/* Mięśnie w tym dniu */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(new Set(
                      day.exercises
                        .filter(e => e.muscleGroup !== 'Cardio')
                        .map(e => e.muscleGroup)
                    )).map(mg => (
                      <span key={mg} className="text-xs bg-white/25 text-white px-2 py-0.5 rounded-full font-medium">
                        {mg}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Lista ćwiczeń */}
                <div className="divide-y divide-slate-50">
                  {day.exercises.map((ex, idx) => (
                    <ExerciseRow key={ex.id} ex={ex} idx={idx} />
                  ))}
                </div>

                {/* Podsumowanie serii */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                  <span>📊 Łącznie: <strong>{day.exercises.reduce((s, e) => s + (e.sets || 0), 0)} serii</strong></span>
                  <span>🏋️ <strong>{day.exercises.filter(e => e.muscleGroup !== 'Cardio' && !e.name.includes('Rozgrzewka')).length} ćwiczeń siłowych</strong></span>
                  {day.exercises.some(e => e.muscleGroup === 'Cardio' && !e.name.includes('Rozgrzewka')) && (
                    <span>❤️ <strong>Cardio</strong></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm py-4 -mx-1 px-1 border-t border-slate-200">
        <button
          onClick={onRegenerate}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:border-violet-300 hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Wygeneruj ponownie
        </button>
        <button
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Zastosuj plan w planerze
        </button>
      </div>
    </div>
  );
}
