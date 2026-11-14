import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, WorkoutDay, SharedWorkout, WorkoutTemplate, Exercise } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkoutPlanner from './components/WorkoutPlanner';
import ExerciseLibrary from './components/ExerciseLibrary';
import Stats from './components/Stats';
import PlanGenerator from './components/PlanGenerator';
import SharesView from './components/SharesView';
import TemplatesView from './components/TemplatesView';
import FavoritesView from './components/FavoritesView';
import SettingsView from './components/settings/SettingsView';
import AppearanceView from './components/settings/AppearanceView';
import HelpView from './components/settings/HelpView';
import AuthScreen from './components/auth/AuthScreen';
import OfflineBanner from './components/auth/OfflineBanner';
import DemoBanner from './components/auth/DemoBanner';
import { UndoRemoveBar } from './components/WorkoutPlanner';
import CloudStatusBanner from './components/CloudStatusBanner';
import { getCloudState, subscribeCloud, CloudState } from './lib/cloudStatus';
import { toUserMessage } from './lib/errorMessages';
import { useWorkoutStore } from './store/workoutStore';
import { useAuthStore } from './store/authStore';
import { useShareStore } from './store/shareStore';
import { useTemplateStore } from './store/templateStore';
import { useWorkoutStats } from './store/workoutStatsStore';
import { useFavoritesStore } from './store/favoritesStore';
import { useAppearanceStore } from './store/appearanceStore';
import { buildDaySnapshot, snapshotToExercises } from './lib/shareService';
import { pluralExercise, pluralShare, toLocalDateStr } from './lib/format';
import { weekSetProgress } from './lib/sets';
import { isSupabaseConfigured } from './lib/supabase';
import { exerciseLibrary } from './data/exercises';
import logoUrl from './assets/fitplanner-logo.png';

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`bg-white/[0.07] rounded-2xl animate-pulse ${className ?? ''}`} />
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-36" />
          <SkeletonBox className="h-4 w-56" />
        </div>
        <SkeletonBox className="h-10 w-28" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <SkeletonBox className="h-9 w-9 mb-2.5" />
            <SkeletonBox className="h-8 w-16 mb-1" />
            <SkeletonBox className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Two cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <SkeletonBox className="h-3 w-10" />
                <SkeletonBox className="h-5 w-28" />
              </div>
              <SkeletonBox className="h-6 w-16 rounded-full" />
            </div>
            <SkeletonBox className="h-3 w-full" />
            <SkeletonBox className="h-3 w-4/5" />
            <SkeletonBox className="h-3 w-3/5" />
          </div>
        ))}
      </div>

      {/* Week overview */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <SkeletonBox className="h-5 w-28 mb-4" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <SkeletonBox className="h-3 w-6" />
              <SkeletonBox className="w-full aspect-square rounded-xl" />
              <SkeletonBox className="h-2.5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function NewPasswordScreen() {
  const { updatePassword, loading } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Hasło musi mieć co najmniej 6 znaków.'); return; }
    if (password !== confirm) { setError('Hasła nie są zgodne.'); return; }
    const { error } = await updatePassword(password);
    if (error) setError(toUserMessage(error, 'Nie udało się wysłać linku do resetowania hasła.'));
    else setSuccess(true);
  };

  return (
    <div
      className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center"
      style={{ minHeight: '100dvh', padding: '1rem' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="w-16 h-16 mx-auto object-contain mb-4 drop-shadow-[0_0_22px_rgba(6,182,212,0.55)]"
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">FitPlanner</h1>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Hasło zostało zmienione!</h3>
              <p className="text-slate-400 text-sm">Za chwilę zostaniesz przekierowany do aplikacji...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold">Ustaw nowe hasło</h3>
                <p className="text-slate-400 text-xs mt-1">Wpisz nowe hasło do swojego konta</p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nowe hasło</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 znaków"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        password.length >= i * 3
                          ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-orange-500' : i <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                          : 'bg-slate-600'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Powtórz hasło</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-xl bg-slate-700/50 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                    confirm && confirm !== password
                      ? 'border-red-500/50 focus:ring-red-500/50'
                      : 'border-slate-600/50 focus:ring-cyan-500/50'
                  }`}
                  autoComplete="new-password"
                />
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-400 mt-1">Hasła nie są zgodne</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold text-sm hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Zapisywanie...
                  </>
                ) : 'Zapisz nowe hasło'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  /** Komunikat typu toast (np. po dodaniu ćwiczeń do planu). */
  const [toast, setToast] = useState<{ ok: boolean; text: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const { user, initialized, isAuthenticated, isDemoMode, loginAsDemo, exitDemoMode, isPasswordRecovery, signOut } = useAuthStore();

  const {
    days, weekMeta, weekKey, lastWorkout,
    goToPrevWeek, goToNextWeek, goToCurrentWeek, goToWeekContaining, goToWeekByKey, copyWorkoutToDay,
    toggleRestDay, addExercise, removeExercise, updateExercise,
    replaceExercise, moveExercise, moveExerciseToDay, moveAllExercisesToDate, resetWeek, loadGeneratedPlan,
    customExercises, addCustomExercise, updateCustomExercise, deleteCustomExercise,
    syncing, isHydrating, refreshFromCloud,
    removedExercises, restoreExercise, expireRemovedExercise,
  } = useWorkoutStore(user?.id, initialized);

  // ── Udostępnienia — jedna instancja store, dane idą do komponentów propami ──
  const shareStore = useShareStore(user?.id);

  // ── Szablony treningów (Moje treningi) ──
  const templateStore = useTemplateStore(user?.id);
  const allExercisesForTemplates = [
    ...exerciseLibrary,
    ...templateStore.templates.flatMap(t => t.exercises),
    ...customExercises,
  ].reduce((acc, ex) => {
    if (!acc.some(e => e.id === ex.id)) acc.push(ex);
    return acc;
  }, [] as (typeof customExercises)[0][]);

  // ── Ulubione ćwiczenia + ustawienia wyglądu ──
  const favorites = useFavoritesStore(user?.id);
  const appearance = useAppearanceStore();

  // ── Statystyki z historii (pulpit) ──
  // Obiekt MUSI mieć stabilną tożsamość — inline literal tworzyłby nowy
  // obiekt co render i przebudowywał zależności (pętla renderów).
  const currentWeekForStats = useMemo(() => ({ key: weekKey, days }), [weekKey, days]);
  const workoutStats = useWorkoutStats(
    user?.id,
    currentWeekForStats,
    activeView === 'dashboard'
  );

  // Plan zmieniony (zaliczone serie) → przelicz statystyki z localStorage.
  const { refresh: refreshWorkoutStats } = workoutStats;
  useEffect(() => {
    refreshWorkoutStats();
  }, [days, refreshWorkoutStats]);
  // ── Postęp tygodnia (karta w pasku bocznym) ──
  //
  // Mianownik i licznik pochodzą z TEJ SAMEJ bazy (lista serii ćwiczenia),
  // więc postęp nie skacze powyżej 100% ani nie utknie poniżej. Cardio jest
  // pomijane — nie ma w nim checkboxów, więc nigdy nie doszłoby do 100%.
  const weekProgress = useMemo(() => weekSetProgress(days).percent, [days]);

  /**
   * Podpis pod paskiem postępu.
   *
   * `days` to tydzień PRZEGLĄDANY w Planerze, więc przy innym tygodniu
   * napis „w tym tygodniu” byłby mylący — podajemy wtedy zakres dat.
   */
  const progressLabel = weekMeta.isCurrentWeek
    ? 'Ukończone serie w tym tygodniu'
    : `Ukończone serie · ${weekMeta.label}`;

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeView]);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleViewChange = (view: View) => { setActiveView(view); scrollToTop(); };

  /** Timer zamykający toast — trzymamy referencję, bo kolejny toast musi
   * anulować poprzedni (inaczej stary timer zgasi nowy komunikat). */
  const toastTimerRef = useRef<number | null>(null);

  /**
   * Pokazuje komunikat typu toast na 3,5 s.
   *
   * Opcjonalna akcja (np. „Cofnij” po usunięciu szablonu) — kliknięcie
   * wykonuje ją i zamyka toast.
   */
  const showToast = useCallback((ok: boolean, text: string, actionLabel?: string, onAction?: () => void) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ ok, text, actionLabel, onAction });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, actionLabel ? 6000 : 3500);
  }, []);

  const handleGoToDay = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setActiveView('planner');
    scrollToTop();
  };

  /**
   * Przenosi do ostatnio zarejestrowanego treningu — skrót „Ostatni trening”
   * w panelu bocznym. Jeśli trening był w poprzednim tygodniu, najpierw
   * przełączamy widok na ten tydzień.
   */
  const handleGoToLastWorkout = () => {
    if (!lastWorkout) return;
    if (lastWorkout.weekKey !== weekKey) {
      goToWeekByKey(lastWorkout.weekKey);
    }
    setSelectedDayIndex(lastWorkout.dayIndex);
    setActiveView('planner');
    scrollToTop();
  };

  /**
   * Dodaje ulubione ćwiczenia do wybranego dnia planu.
   *
   * Po dodaniu przechodzimy do Planera i podświetlamy wybrany dzień,
   * żeby od razu widać efekt.
   */
  const handleAddFavoritesToPlan = (dayId: string, exerciseIds: string[]) => {
    const exercises = allExercisesForTemplates.filter(e => exerciseIds.includes(e.id));
    exercises.forEach(ex => addExercise(dayId, ex));

    const day = days.find(d => d.id === dayId);
    const dayIndex = days.findIndex(d => d.id === dayId);
    if (dayIndex >= 0) {
      setSelectedDayIndex(dayIndex);
    }
    setActiveView('planner');
    scrollToTop();

    const count = exercises.length;
    showToast(
      true,
      `Dodano ${count} ${count === 1 ? 'ćwiczenie' : 'ćwiczeń'} do: ${day?.name ?? 'planu'}.`
    );
  };

  const handleApplyGeneratedPlan = (generatedDays: WorkoutDay[]) => {
    loadGeneratedPlan(generatedDays);
    setActiveView('planner');
    scrollToTop();
  };

  /**
   * Dni, w których są już ćwiczenia — dla podpowiedzi w pickerze dnia.
   *
   * Klucz to data w formacie `YYYY-MM-DD` (lokalna), wartość to liczba
   * ćwiczeń w dniu. Dzięki temu przy wyborze dnia widzimy, który jest wolny.
   */
  const busyDates = useMemo(() => {
    const map: Record<string, number> = {};
    if (!weekMeta) return map;
    const start = new Date(weekMeta.startDate);
    days.forEach((day, i) => {
      if (!day.exercises.length) return;
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      map[toLocalDateStr(d)] = day.exercises.length;
    });
    return map;
  }, [days, weekMeta]);

  /** Ostatni odbiorcy udostępnień — podpowiedzi w oknie wysyłki. */
  const recentRecipients = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of shareStore.outgoing) {
      const email = (s.recipient_email ?? '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      list.push(email);
    }
    return list;
  }, [shareStore.outgoing]);

  // ── Udostępnianie ──────────────────────────────────────────────────────────

  /** Nadawca: wysyła migawkę dnia na podany adres e-mail. */
  const handleSendShare = async (
    recipientEmail: string,
    day: WorkoutDay,
    weekKey: string
  ): Promise<{ error: Error | null }> => {
    return shareStore.sendShare({
      recipientEmail,
      weekKey,
      dayIndex: day.dayIndex,
      dayName: day.name,
      dayData: buildDaySnapshot(day),
    });
  };

  /**
   * Odbiorca: akceptuje udostępnienie.
   *
   * KOLEJNOŚĆ JEST WAŻNA: najpierw zapisujemy ćwiczenia do planu i SPRAWDZAMY
   * błąd, a dopiero potem oznaczamy udostępnienie jako zaakceptowane. W drugą
   * stronę odbiorca zobaczyłby „Zaakceptowane" przy pustym dniu w planie.
   */
  const handleAcceptShare = async (
    share: SharedWorkout,
    targetDateStr: string
  ): Promise<{ error: Error | null }> => {
    const exercises = snapshotToExercises(share.day_data);
    if (exercises.length === 0) {
      return { error: new Error('To udostępnienie nie zawiera żadnych ćwiczeń.') };
    }

    const saved = await copyWorkoutToDay(exercises, targetDateStr);
    if (saved.error) return { error: saved.error };

    const response = await shareStore.respond(
      share.id,
      'accepted',
      saved.weekKey,
      saved.dayIndex
    );
    if (response.error) return { error: response.error };

    // Pokaż odbiorcy tydzień, w którym wylądował trening.
    goToWeekContaining(new Date(`${targetDateStr}T00:00:00`));
    return { error: null };
  };

  /** Odbiorca: odrzuca udostępnienie — nic nie trafia do planu. */
  const handleDeclineShare = async (share: SharedWorkout): Promise<{ error: Error | null }> => {
    return shareStore.respond(share.id, 'declined');
  };

  /** Nadawca: anuluje oczekujące udostępnienie. */
  const handleCancelShare = async (shareId: string): Promise<{ error: Error | null }> => {
    return shareStore.cancel(shareId);
  };

  // ── Status chmury i automatyczne ponawianie ──────────────────────────
  //
  // Gdy Supabase milczy (awaria, wisząca sesja), aplikacja pracuje na danych
  // lokalnych i sama ponawia połączenie: 5 s → 15 s → 45 s → 5 min.
  const [cloudFailed, setCloudFailed] = useState(false);
  const [cloudRetrying, setCloudRetrying] = useState(false);

  // Licznik prób trzymamy w REF, bo efekt ponawiania nie może zależeć od
  // tożsamości funkcji (ta zmienia się przy każdym renderze → timer byłby
  // resetowany i ponowienie nigdy by nie nastąpiło).
  const backoffStepRef = useRef(0);
  const retryingRef = useRef(false);
  const retryCloudRef = useRef<() => Promise<void>>(async () => {});

  useEffect(
    () =>
      subscribeCloud((state: CloudState) => {
        setCloudFailed(state === 'failed');
        // Chmura wróciła — zaczynamy od nowa od najkrótszego odstępu.
        if (state === 'ok') backoffStepRef.current = 0;
      }),
    []
  );

  const retryCloud = useCallback(async () => {
    if (retryingRef.current) return;
    retryingRef.current = true;
    setCloudRetrying(true);
    try {
      await Promise.allSettled([
        refreshFromCloud(),
        templateStore.refreshTemplates(),
        favorites.sync(),
        shareStore.refresh(),
      ]);
    } finally {
      retryingRef.current = false;
      setCloudRetrying(false);
    }
  }, [refreshFromCloud, templateStore, favorites, shareStore]);

  // Najświeższa wersja ponowienia — efekt ponawiania korzysta z niej,
  // żeby nie restartować się przy każdym renderze.
  useEffect(() => {
    retryCloudRef.current = retryCloud;
  }, [retryCloud]);

  useEffect(() => {
    if (!cloudFailed) return;

    // Kolejne próby z coraz dłuższym odstępem (5 s, 15 s, 45 s, 5 min).
    const delays = [5000, 15000, 45000, 300000];
    let timer: number | undefined;

    const schedule = () => {
      const delay = delays[Math.min(backoffStepRef.current, delays.length - 1)];
      backoffStepRef.current += 1;
      timer = window.setTimeout(async () => {
        await retryCloudRef.current();
        if (getCloudState() === 'failed') schedule();
      }, delay);
    };

    schedule();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [cloudFailed]);

  // ── Skrót: Ctrl+Z cofa ostatnie usunięcie ────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      // W polu tekstowym zostawiamy natywne cofanie (edytujemy wartość).
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const last = removedExercises[removedExercises.length - 1];
      if (!last) return;
      e.preventDefault();
      restoreExercise(last);
      showToast(
        true,
        last.kind === 'weekReset'
          ? 'Przywrócono plan tygodnia.'
          : `Przywrócono ćwiczenie „${last.exercise.name}”.`
      );
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removedExercises, restoreExercise, showToast]);

  // ── Szablony treningów ──
  const handleApplyTemplate = (
    template: WorkoutTemplate,
    exercises: Exercise[],
    mode: 'append' | 'replace',
    dayId: string
  ) => {
    const targetDay = days.find(d => d.id === dayId);
    if (!targetDay) return;

    // Prepare exercises with fresh IDs and reset setLogs
    const cleanExercises = exercises.map(ex => ({
      ...ex,
      id: `${template.id}-${ex.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      setLogs: ex.setLogs?.map(log => ({
        ...log,
        id: `set-${Date.now()}-${Math.random()}`,
        done: false,
        actualReps: null,
      })) ?? [],
    }));

    if (mode === 'replace') {
      // Clear existing exercises first
      targetDay.exercises.forEach(ex => removeExercise(targetDay.id, ex.id));
    }

    // Add new exercises
    for (const ex of cleanExercises) {
      addExercise(targetDay.id, ex);
    }

    // If we were highlighting a day, clear it
    setSelectedDayIndex(null);

    // Odnotuj zastosowanie — porządkuje listę („ostatnio używane”)
    // i jest widoczne na karcie szablonu.
    void templateStore.markUsed(template.id);

    // Informacja zwrotna — bez niej użytkownik nie wie, co się stało.
    const count = cleanExercises.length;
    showToast(
      true,
      `Dodano ${count} ${pluralExercise(count)} do: ${targetDay.name}.`,
      'Otwórz w Planerze',
      () => {
        setActiveView('planner');
        scrollToTop();
      }
    );
  };

  const handleCreateTemplateFromDay = async (
    _day: WorkoutDay,
    templateData: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // The template data comes from CreateTemplateModal with name, description, color, category, exercises
    await templateStore.addTemplate(templateData);
  };

  if (isSupabaseConfigured && !initialized) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="w-16 h-16 mx-auto object-contain mb-6 drop-shadow-[0_0_22px_rgba(6,182,212,0.55)]"
          />
          <div className="flex items-center gap-2 text-slate-400 justify-center">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Ekran ustawienia nowego hasła (po kliknięciu linku z emaila) ──
  if (isPasswordRecovery) {
    return <NewPasswordScreen />;
  }

  if (isSupabaseConfigured && !isAuthenticated) {
    return <AuthScreen onDemoLogin={loginAsDemo} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return (
        <Dashboard
          days={days}
          stats={workoutStats.stats}
          onGoToPlanner={() => handleViewChange('planner')}
          onGoToDay={handleGoToDay}
        />
      );
      case 'generator': return <PlanGenerator onApplyPlan={handleApplyGeneratedPlan} onGoToPlanner={() => handleViewChange('planner')} />;
      case 'planner':
        return (
          <>
            {/* Banner: oczekujące udostępnienia — klikalny, prowadzi do zakładki */}
            {shareStore.pendingCount > 0 && (
              <button
                onClick={() => handleViewChange('shares')}
                className="mb-3 w-full bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-cyan-500/15 active:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-cyan-500">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-cyan-700 text-xs sm:text-sm font-bold">
                    Masz {shareStore.pendingCount} {pluralShare(shareStore.pendingCount)} do akceptacji
                  </span>
                  <span className="block text-cyan-500 text-[11px] mt-0.5">
                    Kliknij, aby zobaczyć szczegóły
                  </span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-cyan-400 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            <WorkoutPlanner
              days={days} weekMeta={weekMeta}
              onToggleRest={toggleRestDay} onAddExercise={addExercise}
              onRemoveExercise={removeExercise} onUpdateExercise={updateExercise}
              onReplaceExercise={replaceExercise} onMoveExercise={moveExercise}
                  onMoveExerciseToDay={moveExerciseToDay}
                  onMoveAllExercisesToDate={moveAllExercisesToDate}
              onResetWeek={resetWeek} onPrevWeek={goToPrevWeek}
              onNextWeek={goToNextWeek} onGoToCurrentWeek={goToCurrentWeek}
              userId={user?.id} onCopyWorkout={copyWorkoutToDay} customExercises={customExercises}
              onSaveCustomExercise={addCustomExercise} onDeleteCustomExercise={deleteCustomExercise}
              highlightDayIndex={selectedDayIndex}
              canShare={shareStore.canShare}
              currentUserEmail={user?.email ?? null}
              recentRecipients={recentRecipients}
              onSendShare={handleSendShare}
              templates={templateStore.templates}
              onApplyTemplate={handleApplyTemplate}
              onCreateTemplateFromDay={handleCreateTemplateFromDay}
            />
          </>
        );
      case 'library':
        return (
          <ExerciseLibrary
            customExercises={customExercises}
            onAddCustomExercise={addCustomExercise}
            onUpdateCustomExercise={updateCustomExercise}
            onDeleteCustomExercise={deleteCustomExercise}
            favoriteIds={favorites.favoriteIds}
            onToggleFavorite={favorites.toggleFavorite}
          />
        );
      case 'favorites':
        return (
          <FavoritesView
            favoriteIds={favorites.favoriteIds}
            allExercises={allExercisesForTemplates}
            days={days}
            onToggleFavorite={favorites.toggleFavorite}
            onClearFavorites={favorites.clearFavorites}
            onAddToPlan={handleAddFavoritesToPlan}
            onGoToPlanner={() => handleViewChange('planner')}
          />
        );
      case 'settings':
        return <SettingsView onGoToHelp={() => handleViewChange('help')} />;
      case 'appearance':
        return (
          <AppearanceView
            settings={appearance.settings}
            onScaleChange={appearance.setScale}
            onAnimationsChange={appearance.setAnimations}
          />
        );
      case 'help':
        return <HelpView onGoToSettings={() => handleViewChange('settings')} />;
      case 'stats': return <Stats days={days} />;
      case 'shares':
        return (
          <SharesView
            incoming={shareStore.incoming}
            outgoing={shareStore.outgoing}
            loading={shareStore.loading}
            error={shareStore.error}
            canShare={shareStore.canShare}
            lastRefreshedAt={shareStore.lastRefreshedAt}
            userId={user?.id ?? null}
            busyDates={busyDates}
            onRefresh={() => shareStore.refresh()}
            onAccept={handleAcceptShare}
            onDecline={handleDeclineShare}
            onCancel={handleCancelShare}
            onNotify={showToast}
            onOpenPlanner={() => handleViewChange('planner')}
          />
        );
      case 'templates':
        return (
          <TemplatesView
            templates={templateStore.templates}
            availableExercises={allExercisesForTemplates}
            days={days}
            loading={templateStore.loading}
            error={templateStore.error}
            onCreateTemplate={templateStore.addTemplate}
            onUpdateTemplate={templateStore.updateTemplate}
            onTogglePin={(template) => templateStore.setPinned(template.id, !template.pinned)}
            onDeleteTemplate={templateStore.deleteTemplate}
            onRestoreTemplate={templateStore.restoreTemplate}
            onDuplicateTemplate={templateStore.duplicateTemplate}
            onApplyTemplate={(template, exercises, mode, dayId) => handleApplyTemplate(template, exercises, mode, dayId)}
            onNotify={showToast}
          />
        );
      default: return null;
    }
  };

  return (
    <div className="app-theme relative min-h-screen bg-[#060d1f] text-slate-100">
      {/* Dekoracyjna poświat — spójna z tłem ekranu logowania.
          UWAGA: bez `relative` na `.main-content` poświat (positioned, z-index auto)
          wypchnęłaby treść na spód (kolejność malowania CSS). */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-10%,rgba(8,145,178,0.22),transparent_70%)]" />
      </div>

      <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0, height: 0, width: 0 }} />

      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        pendingCount={shareStore.pendingCount}
        progress={weekProgress}
        progressLabel={progressLabel}
        favoriteCount={favorites.favoriteCount}
        user={user}
        onSignOut={signOut}
        lastWorkout={lastWorkout}
        onGoToLastWorkout={handleGoToLastWorkout}
      />

      <div className="main-content relative">
        {/* Top safe area bar with theme color - prevents frosted glass blur on PWA */}
        <div className="h-safe bg-[#060d1f] sticky top-0 z-10" aria-hidden="true" />

        {/* Toast — komunikat po akcji (np. dodaniu ćwiczeń do planu) */}
        {toast && (
          <div
            role="status"
            className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[104px] md:bottom-6 w-[calc(100%-2rem)] max-w-sm animate-fade-up"
          >
            <div
              className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${
                toast.ok
                  ? 'border-emerald-400/30 bg-[#0f2a1e]/95 text-emerald-200'
                  : 'border-red-400/30 bg-[#2a1015]/95 text-red-200'
              }`}
            >
              {toast.ok ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16h.01" />
                </svg>
              )}
              <span className="min-w-0 flex-1">{toast.text}</span>

              {/* Akcja toasta (np. „Cofnij” po usunięciu szablonu) */}
              {toast.actionLabel && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    setToast(null);
                  }}
                  className="flex-shrink-0 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20 cursor-pointer"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
          </div>
        )}

        {isDemoMode && <DemoBanner onExit={exitDemoMode} />}
        {!isSupabaseConfigured && !offlineDismissed && <OfflineBanner onDismiss={() => setOfflineDismissed(true)} />}
        <CloudStatusBanner onRetry={retryCloud} retrying={cloudRetrying} />

        {syncing && isSupabaseConfigured && (
          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-cyan-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-cyan-400 text-xs font-medium">Synchronizowanie danych...</p>
          </div>
        )}

        <main>
          <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 pt-8 pb-nav sm:pt-10">
            {isHydrating ? <SkeletonLoader /> : renderView()}
          </div>
        </main>

        {/* Undo remove bar - visible on all pages */}
        {removedExercises.length > 0 && (
          <UndoRemoveBar
            removedExercises={removedExercises}
            onRestore={(entry) => {
              restoreExercise(entry);
              showToast(
                true,
                entry.kind === 'weekReset'
                  ? 'Przywrócono plan tygodnia.'
                  : `Przywrócono ćwiczenie „${entry.exercise.name}”.`
              );
            }}
            onExpire={expireRemovedExercise}
          />
        )}
      </div>
    </div>
  );
}
