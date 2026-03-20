import { useState, useEffect, useRef } from 'react';
import { View, WorkoutDay } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkoutPlanner from './components/WorkoutPlanner';
import ExerciseLibrary from './components/ExerciseLibrary';
import Stats from './components/Stats';
import PlanGenerator from './components/PlanGenerator';
import AuthScreen from './components/auth/AuthScreen';
import OfflineBanner from './components/auth/OfflineBanner';
import DemoBanner from './components/auth/DemoBanner';
import { useWorkoutStore } from './store/workoutStore';
import { useAuthStore } from './store/authStore';
import { isSupabaseConfigured } from './lib/supabase';

// ── Ekran ustawienia nowego hasła ─────────────────────────────────────────────
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
    if (error) setError(error.message);
    else setSuccess(true);
  };

  return (
    <div
      className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center"
      style={{ minHeight: '100dvh', padding: '1rem' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30 mb-4">
            <span className="text-3xl">🏋️</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FitPlaner</h1>
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 mb-3">
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
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
                      : 'border-slate-600/50 focus:ring-violet-500/50'
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
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2"
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

// ── Dev Toolbar (tylko w trybie development) ──────────────────────────────────
type DevViewport = 'responsive' | 'mobile' | 'tablet' | 'desktop';

const DEV_VIEWPORTS: { id: DevViewport; label: string; width: string; icon: string }[] = [
  { id: 'responsive',  label: 'Auto',   width: '100%',   icon: '⊞' },
  { id: 'mobile',      label: '375px',  width: '375px',  icon: '📱' },
  { id: 'tablet',      label: '768px',  width: '768px',  icon: '🪟' },
  { id: 'desktop',     label: '1280px', width: '1280px', icon: '🖥️' },
];

function DevToolbar({ viewport, onChange }: { viewport: DevViewport; onChange: (v: DevViewport) => void }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
      borderBottom: '1px solid rgba(139,92,246,0.4)',
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '5px 12px', height: '36px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginRight: '4px' }}>
        🏋️ Dev
      </span>
      <div style={{ width: '1px', height: '16px', background: 'rgba(139,92,246,0.4)', margin: '0 4px' }} />
      {DEV_VIEWPORTS.map(vp => (
        <button
          key={vp.id}
          onClick={() => onChange(vp.id)}
          style={{
            padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
            background: viewport === vp.id ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.06)',
            color: viewport === vp.id ? '#fff' : '#a5b4fc',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: '10px' }}>{vp.icon}</span>
          {vp.label}
        </button>
      ))}
      <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(165,180,252,0.5)', fontFamily: 'monospace' }}>
        {viewport === 'responsive' ? 'dopasowane do okna' : DEV_VIEWPORTS.find(v => v.id === viewport)?.width}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV;

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [devViewport, setDevViewport] = useState<DevViewport>('responsive');
  const topRef = useRef<HTMLDivElement>(null);

  const { user, initialized, isAuthenticated, isDemoMode, loginAsDemo, exitDemoMode, isPasswordRecovery } = useAuthStore();

  const {
    days, weekMeta,
    goToPrevWeek, goToNextWeek, goToCurrentWeek, copyFromPrevWeek,
    toggleRestDay, addExercise, removeExercise, updateExercise,
    replaceExercise, moveExercise, resetWeek, loadGeneratedPlan,
    customExercises, addCustomExercise, updateCustomExercise, deleteCustomExercise,
    syncing,
  } = useWorkoutStore(user?.id);

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

  const handleApplyGeneratedPlan = (generatedDays: WorkoutDay[]) => {
    loadGeneratedPlan(generatedDays);
    setActiveView('planner');
    scrollToTop();
  };

  if (isSupabaseConfigured && !initialized) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30 mb-6">
            <span className="text-3xl">🏋️</span>
          </div>
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
      case 'dashboard': return <Dashboard days={days} onGoToPlanner={() => handleViewChange('planner')} />;
      case 'generator': return <PlanGenerator onApplyPlan={handleApplyGeneratedPlan} onGoToPlanner={() => handleViewChange('planner')} />;
      case 'planner':
        return (
          <WorkoutPlanner
            days={days} weekMeta={weekMeta}
            onToggleRest={toggleRestDay} onAddExercise={addExercise}
            onRemoveExercise={removeExercise} onUpdateExercise={updateExercise}
            onReplaceExercise={replaceExercise} onMoveExercise={moveExercise}
            onResetWeek={resetWeek} onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek} onGoToCurrentWeek={goToCurrentWeek}
            onCopyFromPrevWeek={copyFromPrevWeek} customExercises={customExercises}
            onSaveCustomExercise={addCustomExercise} onDeleteCustomExercise={deleteCustomExercise}
          />
        );
      case 'library':
        return <ExerciseLibrary customExercises={customExercises} onAddCustomExercise={addCustomExercise} onUpdateCustomExercise={updateCustomExercise} onDeleteCustomExercise={deleteCustomExercise} />;
      case 'stats': return <Stats days={days} />;
      default: return null;
    }
  };

  const vpWidth = DEV_VIEWPORTS.find(v => v.id === devViewport)?.width ?? '100%';
  const isConstrained = isDev && devViewport !== 'responsive';

  return (
    <div className="min-h-screen bg-slate-50">
      <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0, height: 0, width: 0 }} />

      {isDev && <DevToolbar viewport={devViewport} onChange={setDevViewport} />}

      <div style={isConstrained ? {
        width: vpWidth, maxWidth: vpWidth, margin: '0 auto',
        marginTop: '36px', minHeight: 'calc(100vh - 36px)',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(139,92,246,0.3), 0 8px 40px rgba(0,0,0,0.35)',
        position: 'relative', background: '#f8fafc',
      } : isDev ? { marginTop: '36px' } : {}}>

        <Sidebar activeView={activeView} onViewChange={handleViewChange} />

        <div className="main-content">
          {isDemoMode && <DemoBanner onExit={exitDemoMode} />}
          {!isSupabaseConfigured && !offlineDismissed && <OfflineBanner onDismiss={() => setOfflineDismissed(true)} />}

          {syncing && isSupabaseConfigured && (
            <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-violet-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-violet-400 text-xs font-medium">Synchronizowanie danych...</p>
            </div>
          )}

          <main>
            <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6">
              {renderView()}
            </div>
          </main>
        </div>

      </div>
    </div>
  );
}
