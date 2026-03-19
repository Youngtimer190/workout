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

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Auth
  const { user, initialized, isAuthenticated, isDemoMode, loginAsDemo, exitDemoMode } = useAuthStore();

  // Workout store — pass userId for cloud sync
  const {
    days,
    weekMeta,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    copyFromPrevWeek,
    toggleRestDay,
    addExercise,
    removeExercise,
    updateExercise,
    replaceExercise,
    moveExercise,
    resetWeek,
    loadGeneratedPlan,
    customExercises,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    syncing,
  } = useWorkoutStore(user?.id);

  // Scroll to top on every view change
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

  const handleViewChange = (view: View) => {
    setActiveView(view);
    // Extra call — some Safari versions need this before state update
    scrollToTop();
  };

  const handleApplyGeneratedPlan = (generatedDays: WorkoutDay[]) => {
    loadGeneratedPlan(generatedDays);
    setActiveView('planner');
    // scrollToTop via useEffect([activeView]) + extra direct call
    scrollToTop();
  };

  // ── Loading screen while auth initializes ──
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

  // ── Auth screen (only when Supabase configured + not authenticated) ──
  if (isSupabaseConfigured && !isAuthenticated) {
    return <AuthScreen onDemoLogin={loginAsDemo} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            days={days}
            onGoToPlanner={() => handleViewChange('planner')}
          />
        );
      case 'generator':
        return (
          <PlanGenerator
            onApplyPlan={handleApplyGeneratedPlan}
            onGoToPlanner={() => handleViewChange('planner')}
          />
        );
      case 'planner':
        return (
          <WorkoutPlanner
            days={days}
            weekMeta={weekMeta}
            onToggleRest={toggleRestDay}
            onAddExercise={addExercise}
            onRemoveExercise={removeExercise}
            onUpdateExercise={updateExercise}
            onReplaceExercise={replaceExercise}
            onMoveExercise={moveExercise}
            onResetWeek={resetWeek}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onGoToCurrentWeek={goToCurrentWeek}
            onCopyFromPrevWeek={copyFromPrevWeek}
            customExercises={customExercises}
            onSaveCustomExercise={addCustomExercise}
            onDeleteCustomExercise={deleteCustomExercise}
          />
        );
      case 'library':
        return (
          <ExerciseLibrary
            customExercises={customExercises}
            onAddCustomExercise={addCustomExercise}
            onUpdateCustomExercise={updateCustomExercise}
            onDeleteCustomExercise={deleteCustomExercise}
          />
        );
      case 'stats':
        return <Stats days={days} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Invisible anchor at absolute top for scrollIntoView */}
      <div ref={topRef} style={{ position: 'absolute', top: 0, left: 0, height: 0, width: 0 }} />

      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <div className="main-content">
        {/* Demo banner */}
        {isDemoMode && (
          <DemoBanner onExit={exitDemoMode} />
        )}

        {/* Offline banner */}
        {!isSupabaseConfigured && !offlineDismissed && (
          <OfflineBanner onDismiss={() => setOfflineDismissed(true)} />
        )}

        {/* Sync indicator */}
        {syncing && isSupabaseConfigured && (
          <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-2 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-violet-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-violet-400 text-xs font-medium">Synchronizowanie danych...</p>
          </div>
        )}

        {/* Main content */}
        <main>
          <div className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
