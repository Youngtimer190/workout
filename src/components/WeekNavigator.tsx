import { useState } from 'react';
import { WeekMeta } from '../store/weekStore';

interface WeekNavigatorProps {
  weekMeta: WeekMeta;
  onPrev: () => void;
  onNext: () => void;
  onGoToday: () => void;
  onCopyFromPrev: () => void;
  trainingDays: number;
  restDays: number;
  totalExercises: number;
}

export default function WeekNavigator({
  weekMeta,
  onPrev,
  onNext,
  onGoToday,
  onCopyFromPrev,
  trainingDays,
  restDays,
  totalExercises,
}: WeekNavigatorProps) {
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);

  const handleCopy = () => {
    setShowCopyConfirm(false);
    onCopyFromPrev();
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIndex = (() => {
    const diff = Math.round((today.getTime() - weekMeta.startDate.getTime()) / 86400000);
    return diff >= 0 && diff <= 6 ? diff : -1;
  })();

  const dayLetters = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMeta.startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Navigation bar ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
        {/* Prev */}
        <button
          onClick={onPrev}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 transition-all cursor-pointer flex-shrink-0"
          title="Poprzedni tydzień"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Week label */}
        <div className="flex-1 min-w-0 text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {weekMeta.isCurrentWeek && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block" />
                Bieżący
              </span>
            )}
            <span className="font-bold text-slate-800 text-sm leading-tight">
              {weekMeta.label}
            </span>
          </div>
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:bg-slate-200 transition-all cursor-pointer flex-shrink-0"
          title="Następny tydzień"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Mini calendar ── */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {weekDays.map((date, i) => {
          const isToday = i === todayIndex;
          const isWeekend = i >= 5;
          return (
            <div
              key={i}
              className={`flex flex-col items-center py-2 ${
                isToday ? 'bg-violet-50' : isWeekend ? 'bg-slate-50/50' : ''
              }`}
            >
              <span className={`text-[9px] font-bold mb-1 uppercase tracking-wide ${
                isToday ? 'text-violet-600' : isWeekend ? 'text-slate-400' : 'text-slate-400'
              }`}>
                {dayLetters[i]}
              </span>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isToday
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : isWeekend
                  ? 'text-slate-500'
                  : 'text-slate-700'
              }`}>
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Stats + Actions ── */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-base">🏋️</span>
              <div>
                <span className="text-sm font-bold text-slate-800">{trainingDays}</span>
                <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">treningi</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base">💪</span>
              <div>
                <span className="text-sm font-bold text-slate-800">{totalExercises}</span>
                <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">ćwiczeń</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base">😴</span>
              <div>
                <span className="text-sm font-bold text-slate-800">{restDays}</span>
                <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">odpoczynek</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {!weekMeta.isCurrentWeek && (
              <button
                onClick={onGoToday}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 active:bg-violet-200 transition-all cursor-pointer border border-violet-100"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Dziś
              </button>
            )}

            {showCopyConfirm ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <span className="text-[11px] text-amber-700 font-medium whitespace-nowrap">Skopiować?</span>
                <button onClick={handleCopy} className="text-[11px] font-bold text-emerald-700 active:text-emerald-900 cursor-pointer">Tak</button>
                <span className="text-amber-300">·</span>
                <button onClick={() => setShowCopyConfirm(false)} className="text-[11px] font-bold text-slate-500 cursor-pointer">Nie</button>
              </div>
            ) : (
              <button
                onClick={() => setShowCopyConfirm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 hover:text-slate-700 active:bg-slate-100 transition-all cursor-pointer whitespace-nowrap"
                title="Skopiuj plan z poprzedniego tygodnia"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                <span className="hidden sm:inline">Kopiuj z poprzedniego</span>
                <span className="sm:hidden">Kopiuj</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
