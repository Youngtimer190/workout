import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatDuration, remainingMs } from '../lib/restTimer';
import {
  addRestTimerSeconds,
  changeDefaultRestSeconds,
  useRestTimer,
  useRestTimerSettings,
} from '../store/restTimerStore';

/**
 * Sterowanie przerwą w nagłówku trackera.
 *
 * Składa się z trzech elementów:
 *   [ − ]  ⏱ 1:30  [ + ]
 *
 *  • przyciski `−` / `+` mają dokładnie te same wymiary i styl co przyciski
 *    steppera (40 px na telefonie, 32 px na desktopie) — dzięki temu
 *    cała aplikacja „dotyka się" tak samo,
 *  • środkowa część (czas) otwiera panel z gotowymi czasami,
 *  • krok to 15 s — spójny z przyciskiem „+15s" w pływającym pasku.
 *
 * Semantyka przycisków:
 *  • gdy żadna przerwa nie trwa → zmieniają DOMYŚLNY czas przerwy
 *    (ten, który wystartuje się po zaznaczeniu serii),
 *  • gdy przerwa trwa → wydłużają albo skracają BIEŻĄCĄ przerwę.
 */

interface RestTimerControlProps {
  /** Otwiera panel z wyborem czasu. */
  onOpenPicker: () => void;
}

export default function RestTimerControl({ onOpenPicker }: RestTimerControlProps) {
  const timer = useRestTimer();
  const { settings } = useRestTimerSettings();

  // Rozmiary jak w stepperze: „expanded" (telefon) = 40 px, „inline" (desktop) = 32 px.
  const useStrip = useMediaQuery('(max-width: 1023px)');
  const btnSize = useStrip ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = useStrip ? 'h-5 w-5' : 'h-4 w-4';

  const active = timer.endsAt != null;
  const paused = timer.paused;
  const left = remainingMs(timer.endsAt, timer.now);

  // Bez przerwy pokazujemy domyślny czas, w trakcie — ile zostało.
  const shownMs = active ? left : settings.defaultDurationMs;

  const adjust = (seconds: number) => {
    if (active) {
      addRestTimerSeconds(seconds);
    } else {
      changeDefaultRestSeconds(seconds);
    }
  };

  const canDecrease = active ? left > 15_000 : settings.defaultDurationMs > 15_000;

  const stepButton = (direction: 1 | -1, ariaLabel: string) => (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => adjust(direction * 15)}
      disabled={direction === -1 && !canDecrease}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
      className={`${btnSize} flex-shrink-0 rounded-xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        direction === 1
          ? 'border-cyan-400/50 bg-cyan-600 text-white shadow-sm shadow-cyan-500/30 hover:bg-cyan-500'
          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {direction === 1 ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className={iconSize}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className={iconSize}>
          <path d="M5 12h14" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {stepButton(-1, active ? 'Skróć przerwę o 15 sekund' : 'Skróć domyślną przerwę o 15 sekund')}

      {/* Czas — kliknięcie otwiera panel z gotowymi czasami */}
      <button
        type="button"
        onClick={onOpenPicker}
        aria-label={active ? 'Zmień czas przerwy' : 'Ustaw czas przerwy'}
        title={active ? 'Zmień czas przerwy' : 'Ustaw czas przerwy'}
        className={`flex h-8 min-w-[52px] items-center justify-center gap-1 rounded-full px-2 text-xs font-bold tabular-nums transition-colors active:scale-95 cursor-pointer ${
          active
            ? paused
              ? 'bg-amber-500 text-white'
              : 'bg-cyan-500 text-white'
            : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        {formatDuration(shownMs)}
      </button>

      {stepButton(1, active ? 'Wydłuż przerwę o 15 sekund' : 'Wydłuż domyślną przerwę o 15 sekund')}
    </div>
  );
}
