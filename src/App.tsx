import { useState } from 'react';
import { View, WorkoutDay } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WorkoutPlanner from './components/WorkoutPlanner';
import ExerciseLibrary from './components/ExerciseLibrary';
import Stats from './components/Stats';
import PlanGenerator from './components/PlanGenerator';
import AuthScreen from './components/auth/AuthScreen';
import OfflineBanner from './components/auth/OfflineBanner';
import { useWorkoutStore } from './store/workoutStore';
import { useAuthStore } from './store/authStore';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  // Auth
  const { user, initialized, isAuthenticated } = useAuthStore();

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
    reorderExercises,
    resetWeek,
    loadGeneratedPlan,
    customExercises,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
    syncing,
  } = useWorkoutStore(user?.id);

  const handleApplyGeneratedPlan = (generatedDays: WorkoutDay[]) => {
    loadGeneratedPlan(generatedDays);
    setActiveView('planner');
  };

  // ── Loading screen while auth initializes ──
  if (isSupabaseConfigured && !initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center">
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
    return <AuthScreen />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard
            days={days}
            onGoToPlanner={() => setActiveView('planner')}
          />
        );
      case 'generator':
        return (
          <PlanGenerator
            onApplyPlan={handleApplyGeneratedPlan}
            onGoToPlanner={() => setActiveView('planner')}
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
            onReorderExercises={reorderExercises}
            onResetWeek={resetWeek}
            onPrevWeek={goToPrevWeek}
            onNextWeek={goToNextWeek}
            onGoToCurrentWeek={goToCurrentWeek}
            onCopyFromPrevWeek={copyFromPrevWeek}
            customExercises={customExercises}
            onSaveCustomExercise={addCustomExercise}
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Offline banner */}
        {!isSupabaseConfigured && !offlineDismissed && (
          <OfflineBanner onDismiss={() => setOfflineDismissed(true)} />
        )}

        {/* Sync indicator */}
        {syncing && isSupabaseConfigured && (
          <div className="bg-violet-500/10 border-b border-violet-500/20 px-4 py-1.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-violet-400 text-xs">Synchronizowanie danych...</p>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-scroll" id="main-scroll">
          <div
            className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-8 py-5 md:py-6"
            style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
          >
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
