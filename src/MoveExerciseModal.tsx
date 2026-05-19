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

  const handleMove = () => {
    if (selectedDayId !== sourceDay.id) {
      onMove(selectedDayId);
    }
  };

  const dayLabels = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">Przenieś ćwiczenie</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Ćwiczenie</p>
            <p className="text-slate-800 font-bold text-base">{exercise.name}</p>
            <p className="text-slate-500 text-sm mt-1">
              <span className="font-semibold">Obecnie:</span> {sourceDay.name}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Wybierz dzień docelowy:
            </label>
            <div className="space-y-2">
              {days.map((day, index) => {
                const isSourceDay = day.id === sourceDay.id;
                const isSelected = selectedDayId === day.id;
                return (
                  <button
                    key={day.id}
                    onClick={() => !isSourceDay && setSelectedDayId(day.id)}
                    disabled={isSourceDay}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSourceDay
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-accepted'
                        : isSelected
                        ? 'border-violet-500 bg-violet-50 shadow-md shadow-violet-100'
                        : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSourceDay
                          ? 'bg-slate-200'
                          : isSelected
                          ? 'bg-violet-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="text-white font-bold text-sm">
                        {day.name.substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`font-semibold text-sm truncate ${
                          isSourceDay ? 'text-slate-400' : isSelected ? 'text-violet-700' : 'text-slate-700'
                        }`}
                      >
                        {day.name}
                      </p>
                      <p
                        className={`text-xs ${
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
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleMove}
            disabled={selectedDayId === sourceDay.id}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 transition-all"
          >
            Przenieś
          </button>
        </div>
      </div>
    </div>
  );
}
