import { useState, useEffect } from 'react';
import { WorkoutDay, Exercise } from '../types';

interface MoveExerciseModalProps {
  exercise: Exercise;
  sourceDay: WorkoutDay;
  days: WorkoutDay[];
  onMove: (targetDayId: string) => void;
  onClose: () => void;
}

export default function MoveExerciseModal({
  exercise,
  sourceDay,
  days,
  onMove,
  onClose,
}: MoveExerciseModalProps) {
  const [selectedDayId, setSelectedDayId] = useState<string>(sourceDay.id);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Zablokuj przewijanie tła gdy modal otwarty
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleMove = () => {
    if (selectedDayId !== sourceDay.id) {
      onMove(selectedDayId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none'
      }}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base sm:text-lg">Przenieś ćwiczenie</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">Ćwiczenie</p>
            <p className="text-slate-800 font-bold text-sm sm:text-base truncate">{exercise.name}</p>
            <p className="text-slate-500 text-xs mt-1">
              <span className="font-semibold">Obecnie:</span> {sourceDay.name}
            </p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
              Wybierz dzień docelowy:
            </label>
            <div className="space-y-1.5">
              {days.map((day) => {
                const isSourceDay = day.id === sourceDay.id;
                const isSelected = selectedDayId === day.id;
                return (
                  <button
                    key={day.id}
                    onClick={() => !isSourceDay && setSelectedDayId(day.id)}
                    disabled={isSourceDay}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      isSourceDay
                        ? 'bg-slate-50 border-slate-200 opacity-50'
                        : isSelected
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-slate-200 active:border-violet-300 active:bg-slate-50'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSourceDay
                          ? 'bg-slate-200'
                          : isSelected
                          ? 'bg-violet-500'
                          : 'bg-slate-100'
                      }`}
                    >
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {day.name.substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`font-semibold text-xs sm:text-sm truncate ${
                          isSourceDay ? 'text-slate-400' : isSelected ? 'text-violet-700' : 'text-slate-700'
                        }`}
                      >
                        {day.name}
                      </p>
                      <p
                        className={`text-[10px] sm:text-xs ${
                          isSourceDay ? 'text-slate-300' : isSelected ? 'text-violet-500' : 'text-slate-400'
                        }`}
                      >
                        {day.isRestDay
                          ? 'Dzień odpoczynku'
                          : day.exercises.length > 0
                          ? `${day.exercises.length} ćwiczeń`
                          : 'Brak ćwiczeń'}
                      </p>
                    </div>
                    {isSelected && !isSourceDay && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-violet-500 flex-shrink-0"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Anuluj
          </button>
          <button
            onClick={handleMove}
            disabled={selectedDayId === sourceDay.id}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 disabled:opacity-50 active:opacity-80"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Przenieś
          </button>
        </div>
      </div>
    </div>
  );
}
