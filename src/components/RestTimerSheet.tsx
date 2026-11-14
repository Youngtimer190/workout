import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  describeDuration,
  formatDuration,
  parseDuration,
  REST_PRESETS,
} from '../lib/restTimer';
import { startRestTimer } from '../store/restTimerStore';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

interface RestTimerSheetProps {
  /** Czas podświetlony na starcie (ms). */
  initialDurationMs: number;
  onClose: () => void;
}

/**
 * Panel wyboru czasu przerwy.
 *
 * Trzy ścieżki, od najszybszej do najdokładniejszej:
 *  1. gotowe czasy (jedno dotknięcie),
 *  2. regulacja krokami ±15 s,
 *  3. wpisanie własnej wartości („90”, „1:30”, „2:00”).
 */
export default function RestTimerSheet({ initialDurationMs, onClose }: RestTimerSheetProps) {
  const [durationMs, setDurationMs] = useState(initialDurationMs);
  const [manual, setManual] = useState('');
  const [manualError, setManualError] = useState(false);
  const keyboardInset = useKeyboardInset();
  const manualRef = useRef<HTMLInputElement>(null);

  // Escape zamyka panel
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Blokada przewijania tła
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleManual = (value: string) => {
    setManual(value);
    if (!value.trim()) {
      setManualError(false);
      return;
    }
    const parsed = parseDuration(value);
    if (parsed == null) {
      setManualError(true);
      return;
    }
    setManualError(false);
    setDurationMs(parsed);
  };

  const handleStart = () => {
    startRestTimer(durationMs);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center modal-overlay"
      onClick={onClose}
      style={{
        WebkitTapHighlightColor: 'transparent',
        paddingTop: 'env(safe-area-ins-top, 0px)',
        paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined,
        '--kb-inset': `${keyboardInset}px`,
      } as CSSProperties}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden modal-sheet animate-slide-up modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Nagłówek */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base sm:text-lg">Czas przerwy</h2>
            <p className="text-[11px] text-cyan-100/80">Ile odpoczywasz między seriami?</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30 cursor-pointer flex-shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-5 w-5 text-white">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Treść */}
        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Wybrany czas */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setDurationMs(d => Math.max(5_000, d - 15_000))}
              aria-label="15 sekund mniej"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              −
            </button>

            <div className="min-w-[124px] text-center">
              <p className="text-4xl font-extrabold text-cyan-700 tabular-nums leading-none">
                {formatDuration(durationMs)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {describeDuration(durationMs)}
              </p>
            </div>

            <button
              onClick={() => setDurationMs(d => Math.min(15 * 60_000, d + 15_000))}
              aria-label="15 sekund więcej"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-lg font-bold transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Gotowe czasy */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Gotowe czasy
            </p>
            <div className="grid grid-cols-5 gap-2">
              {REST_PRESETS.map(preset => {
                const active = preset.ms === durationMs;
                return (
                  <button
                    key={preset.ms}
                    onClick={() => {
                      setDurationMs(preset.ms);
                      setManual('');
                      setManualError(false);
                    }}
                    className={`rounded-xl border py-2 text-xs font-bold transition-colors active:scale-95 cursor-pointer ${
                      active
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Własny czas */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Własny czas
            </p>
            <div className="flex items-center gap-2">
              <input
                ref={manualRef}
                type="text"
                inputMode="numeric"
                value={manual}
                onChange={e => handleManual(e.target.value)}
                placeholder="np. 1:30"
                aria-label="Własny czas przerwy"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                  manualError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              />
              <button
                onClick={() => manualRef.current?.focus()}
                className="flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                Wpisz
              </button>
            </div>
            {manualError && (
              <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                Nie rozpoznaję tego czasu. Spróbuj „90” (sekund) albo „1:30” (minuty:sekundy).
              </p>
            )}
          </div>
        </div>

        {/* Akcja */}
        <div className="border-t border-slate-100 px-4 py-3 flex-shrink-0">
          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-600/25 transition-all hover:brightness-110 active:scale-[0.99] cursor-pointer"
          >
            Start przerwy
          </button>
        </div>
      </div>
    </div>
  );
}
