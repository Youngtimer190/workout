import { useEffect } from 'react';
import { formatDuration, progressRatio, remainingMs } from '../lib/restTimer';
import {
  addRestTimerSeconds,
  dismissFinished,
  pauseRestTimer,
  resumeRestTimer,
  stopRestTimer,
  useRestTimer,
} from '../store/restTimerStore';

/**
 * Pływający pasek timera odpoczynku.
 *
 * Timer jest jednym dla całej aplikacji, więc pasek żyje na najwyższym
 * poziomie (App) i jest widoczny w każdym widoku — także po przejściu
 * do innej zakładki w trakcie przerwy.
 *
 * Zasada UX: użytkownik ma WIDZIEĆ ile zostało, nie musi słuchać.
 * Dźwięk jest dodatkiem, bo w telefonie bywa zagłuszony albo wyciszony.
 */

/** Ile sekundy wibracji „ostatnie 3 s” — zdarza się raz na sekundę. */
const FINISHED_AUTO_HIDE_MS = 9000;

export default function RestTimerBar() {
  const timer = useRestTimer();

  // Stan „Czas!” znika sam po kilku sekundach.
  useEffect(() => {
    if (timer.finishedAt == null) return;
    const id = window.setTimeout(() => dismissFinished(), FINISHED_AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [timer.finishedAt]);

  const finished = timer.finishedAt != null;
  const active = timer.endsAt != null;

  if (!active && !finished) return null;

  // Czas pochodzi ze sklepu (odświeżany raz na sekundę) — dzięki temu
  // licznik jest zawsze zgodny z pierścieniem postępu.
  const left = remainingMs(timer.endsAt, timer.now);
  const ratio = progressRatio(timer.startedAt, timer.endsAt, timer.now);

  // Ostatnie 10 sekund — kolor ostrzegawczy.
  const ending = active && left <= 10_000;
  const ringColor = finished
    ? 'text-emerald-400'
    : ending
      ? left <= 3_000
        ? 'text-red-400'
        : 'text-amber-400'
      : 'text-cyan-400';

  const label = finished
    ? 'Czas!'
    : timer.paused
      ? 'Pauza'
      : 'Przerwa';

  const subLabel = finished
    ? 'Gotowy do kolejnej serii'
    : timer.paused
      ? 'Wciśnij ▶, aby wznowić'
      : 'odpoczynek między seriami';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[104px] md:bottom-6 w-[calc(100%-2rem)] max-w-sm animate-fade-up"
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-2xl backdrop-blur-xl ${
          finished
            ? 'border-emerald-400/40 bg-[#0f2a1e]/95'
            : 'border-cyan-400/30 bg-[#0b1730]/95'
        }`}
      >
        {/* Pierścień postępu + czas */}
        <div className="relative h-12 w-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-white/10"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - ratio)}
              className={`${ringColor} transition-[stroke-dashoffset] duration-300`}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-[13px] font-extrabold tabular-nums ${
              finished ? 'text-emerald-300' : 'text-white'
            }`}
          >
            {finished ? '✓' : formatDuration(left)}
          </span>
        </div>

        {/* Opis */}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${finished ? 'text-emerald-200' : 'text-white'}`}>
            {label}
          </p>
          <p className="truncate text-[11px] text-slate-400">{subLabel}</p>
        </div>

        {/* Akcje */}
        {!finished && (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              onClick={() => addRestTimerSeconds(15)}
              aria-label="Dodaj 15 sekund"
              className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
            >
              +15s
            </button>

            {timer.paused ? (
              <button
                onClick={resumeRestTimer}
                aria-label="Wznów przerwę"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-white transition-colors hover:bg-cyan-400 active:scale-95 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M8 5.14v13.72L19 12 8 5.14z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={pauseRestTimer}
                aria-label="Wstrzymaj przerwę"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                </svg>
              </button>
            )}

            <button
              onClick={stopRestTimer}
              aria-label="Zatrzymaj przerwę"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-400 transition-colors hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {finished && (
          <button
            onClick={dismissFinished}
            className="flex-shrink-0 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/25 active:scale-95 cursor-pointer"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
