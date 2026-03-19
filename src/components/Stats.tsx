import { useState } from 'react';
import { WorkoutDay } from '../types';
import { muscleGroupBgColors, muscleGroupColors } from '../data/exercises';
import { useAuthStore } from '../store/authStore';
import { isSupabaseConfigured } from '../lib/supabase';
import DeleteAccountModal from './auth/DeleteAccountModal';

interface StatsProps {
  days: WorkoutDay[];
}



export default function Stats({ days }: StatsProps) {
  const { user, signOut, loading } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  const getInitials = (email: string, name?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const userEmail = user?.email || '';
  const initials = user ? getInitials(userEmail, user?.user_metadata?.full_name) : 'U';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Statystyki</h1>
        <p className="text-slate-500 text-sm mt-0.5">Analiza Twojego planu treningowego</p>
      </div>

      {/* ── STATYSTYKI PLANU ── */}

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
          <div className="flex flex-col gap-3">
            {[
              { label: 'Początkujący', emoji: '🌱', bar: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              { label: 'Średniozaawansowany', emoji: '⚙️', bar: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
              { label: 'Zaawansowany', emoji: '🚀', bar: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700' },
            ].map(({ label, emoji, bar, bg, text }) => {
              const cnt = difficultyCount[label] || 0;
              const pct = allExercises.length ? Math.round((cnt / allExercises.length) * 100) : 0;
              return (
                <div key={label} className={`rounded-xl p-3 ${bg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{emoji}</span>
                      <span className={`text-sm font-semibold ${text} truncate`}>{label}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className={`text-sm font-bold ${text}`}>{cnt}</span>
                      <span className="text-xs text-slate-400">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-white rounded-full h-2">
                    <div
                      className={`${bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
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

      {/* ── SEKCJA KONTA ── na dole ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 sm:px-5">
          <h2 className="text-white font-bold text-base">👤 Twoje konto</h2>
        </div>
        <div className="p-4 sm:p-5">
          {isSupabaseConfigured && user ? (
            <>
              <div className="flex items-center gap-3 sm:gap-4 mb-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-200">
                  <span className="text-white text-xl sm:text-2xl font-bold">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {user?.user_metadata?.full_name && (
                    <p className="font-bold text-slate-800 text-base sm:text-lg truncate">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  <p className="text-slate-500 text-sm truncate">{userEmail}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">Zalogowany</span>
                    <span className="text-xs text-slate-400">· synchronizacja aktywna</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut || loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-base transition-colors disabled:opacity-50"
                >
                  {signingOut ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Wylogowywanie...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Wyloguj się</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-semibold text-base border border-red-100 hover:border-red-200 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Usuń konto</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
                Usunięcie konta jest nieodwracalne i spowoduje utratę wszystkich danych.
              </p>
            </>
          ) : isSupabaseConfigured && !user ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-slate-600 font-semibold mb-1">Nie jesteś zalogowany</p>
              <p className="text-slate-400 text-sm">Zaloguj się, aby synchronizować dane między urządzeniami.</p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Tryb offline</p>
                <p className="text-sm text-slate-500 mt-0.5">Dane zapisywane lokalnie na urządzeniu.</p>
                <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">
                    📋 Skonfiguruj Supabase, aby korzystać z konta na wielu urządzeniach.
                    <br />
                    <span className="opacity-70">Zobacz instrukcję w pliku SUPABASE_SETUP.md</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete account modal */}
      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
