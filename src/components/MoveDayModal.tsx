import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { WorkoutDay } from '../types';
import {
  getMondayOf,
  getWeekKey,
  formatWeekLabel,
  mondayOfWeekKey,
  DAY_NAMES,
} from '../store/weekStore';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

interface MoveDayModalProps {
  sourceDay: WorkoutDay;
  onMove: (targetDateStr: string) => void;
  onClose: () => void;
}

/** Zbuduj dzisiejszą datę jako lokalny `YYYY-MM-DD` (nigdy `toISOString` — to UTC). */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MoveDayModal({ sourceDay, onMove, onClose }: MoveDayModalProps) {
  const [targetDateStr, setTargetDateStr] = useState<string>(todayLocal());

  // Wysokość klawiatury ekranowej — na iPhone modal musi się podnieść,
  // bo `position: fixed` nie reaguje na otwarcie klawiatury.
  const keyboardInset = useKeyboardInset();

  // Pole wyboru daty — na telefonie leży pod podsumowaniem dnia.
  const dateInputRef = useRef<HTMLInputElement>(null);
  // Czy zdążyliśmy już podnieść pole nad klawiaturę (jednokrotnie).
  const keyboardLiftedRef = useRef(false);

  // Zamknij na Escape
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

  // Na telefonie podsumowanie dnia z listą ćwiczeń zajmuje cały ekran,
  // a pole wyboru daty jest pod spodem — przewijamy do niego od razu
  // po otwarciu, tak jak w modalu udostępniania.
  useEffect(() => {
    const el = dateInputRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Klawiatura ekranowa (iPhone) zasłania dół ekranu i zmniejsza widoczny
  // obszar modalu — pole podnosimy jeszcze raz, żeby zostało nad klawiaturą.
  // Nie sprawdzamy `activeElement`: picker dat nie focusuje pola, a to właśnie
  // ono jest celem interakcji, więc ma zostać widoczne.
  useEffect(() => {
    const el = dateInputRef.current;
    if (!el) return;
    if (keyboardInset === 0) {
      // Klawiatura się zamknęła — przy kolejnym otwarciu znów podniesiemy pole.
      keyboardLiftedRef.current = false;
      return;
    }
    if (keyboardLiftedRef.current) return;
    keyboardLiftedRef.current = true;
    el.scrollIntoView({ block: 'center' });
  }, [keyboardInset]);

  const totalSets = sourceDay.exercises.reduce((acc, e) => acc + (e.sets || 0), 0);

  // ── Pochodne z wybranej daty ──
  const targetDate = targetDateStr ? new Date(`${targetDateStr}T00:00:00`) : null;
  const isValid = !!targetDate && !isNaN(targetDate.getTime());
  const targetMonday = isValid ? getMondayOf(targetDate as Date) : null;
  const targetKey = isValid && targetMonday ? getWeekKey(targetMonday) : '';
  const targetIdx = isValid ? ((targetDate as Date).getDay() + 6) % 7 : -1;

  // Guard: data rozwiązuje się do dnia źródłowego
  const sourceKey = sourceDay.id.split('-day-')[0];
  const sourceIdx = sourceDay.dayIndex;
  const isSameDay = isValid && targetKey === sourceKey && targetIdx === sourceIdx;
  const isCrossWeek = isValid && targetKey !== sourceKey;
  const canMove = isValid && !isSameDay;

  // Tydzień, z którego pochodzi przenoszony dzień (np. „27 – 2 lis 2026").
  const sourceMonday = mondayOfWeekKey(sourceKey);
  const sourceWeekLabel = sourceMonday ? formatWeekLabel(sourceMonday) : null;

  const handleMove = () => {
    if (!canMove) return;
    onMove(targetDateStr);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
      style={{
        WebkitTapHighlightColor: 'transparent',
        // Notch / Dynamic Island — karta nie może wchodzić pod niego
        paddingTop: 'env(safe-area-inset-top, 0px)',
        // Klawiatura ekranowa (iPhone) zasłania dół ekranu — modal podnosi się
        paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined,
        // Wysokość klawiatury dla .modal-sheet (max-height: 90dvh - klawiatura)
        '--kb-inset': `${keyboardInset}px`,
      } as CSSProperties}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden modal-sheet animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base sm:text-lg">Przenieś trening</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30 cursor-pointer flex-shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div
          className="p-4 space-y-4 overflow-y-auto flex-1"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {/* Podsumowanie dnia */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
              {sourceDay.name}
              {sourceWeekLabel && (
                <span className="normal-case tracking-normal font-normal"> · {sourceWeekLabel}</span>
              )}
            </p>
            <p className="text-slate-800 font-bold text-sm sm:text-base">
              {sourceDay.exercises.length} ćwiczeń
              {totalSets > 0 && <span className="text-slate-400 font-normal"> · {totalSets} serii</span>}
            </p>

            {/* Podgląd zawartości — użytkownik widzi dokładnie to, co przenosi */}
            <ul className="mt-2 space-y-0.5">
              {sourceDay.exercises.map((ex, i) => (
                <li key={`${ex.id}-${i}`} className="text-xs text-slate-500 truncate">
                  • {ex.name}
                  {ex.sets ? ` — ${ex.sets} × ${ex.reps ?? ''}`.trim() : ''}
                </li>
              ))}
            </ul>
          </div>

          {/* Date picker */}
          <div>
            <label htmlFor="move-day-date" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 cursor-pointer">
              Wybierz dzień docelowy:
            </label>
            <div className="flex justify-center">
              <input
                id="move-day-date"
                ref={dateInputRef}
                type="date"
                value={targetDateStr}
                onChange={(e) => setTargetDateStr(e.target.value)}
                className="w-[240px] max-w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 text-base sm:text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
            </div>

            {/* Helper line — nazwa dnia + etykieta tygodnia */}
            {isValid && targetMonday ? (
              <div className="mt-3 bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-slate-800 font-semibold text-sm">
                  {DAY_NAMES[targetIdx]}
                  <span className="text-slate-400 font-normal"> · </span>
                  <span className="text-slate-500 font-normal text-xs">{formatWeekLabel(targetMonday)}</span>
                </p>
                {isCrossWeek ? (
                  <p className="text-[11px] text-violet-500 mt-1 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Inny tydzień — progres serii (✓ i ciężary) zostanie zachowany
                  </p>
                ) : isSameDay ? (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 flex-shrink-0">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    To dzień źródłowy — wybierz inną datę
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ćwiczenia zostaną przeniesione na ten dzień
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 mt-2">
                Wybierz poprawną datę
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0"
          // Home indicator iPhone — przyciski nie mogą pod niego wchodzić
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50 cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Anuluj
          </button>
          <button
            onClick={handleMove}
            disabled={!canMove}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Przenieś
          </button>
        </div>
      </div>
    </div>
  );
}
