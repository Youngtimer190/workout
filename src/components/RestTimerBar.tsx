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
 *
 * ── Dlaczego przyciski są duże ─────────────────────────────────────────────
 * Pasek leży na samym dole ekranu — to najtrudniejsze miejsce do
 * trafienia palcem. Dlatego każdy przycisk ma 44 px (minimum z wytycznych
 * Apple dla iOS, większe niż 40 px w stepperze), a najczęstsza akcja
 * („daj mi więcej przerwy") dostaje największy, wyróżniony cel.
 */

const FINISHED_AUTO_HIDE_MS = 9000;

/** Pierścień postępu — 56 px, czytelna liczba w środku. */
const RING_SIZE = 56;
const RING_R = 23;

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

  const label = finished ? 'Czas!' : timer.paused ? 'Pauza' : 'Przerwa';

  // Pod spodem: po której serii jest przerwa (kontekst, którego pasek
  // sam nie zna — jest globalny).
  const subLabel = finished
    ? 'Gotowy do kolejnej serii'
    : timer.paused
      ? 'Wciśnij ▶, aby wznowić'
      : timer.restLabel
        ? `po: ${timer.restLabel}`
        : 'odpoczynek między seriami';

  return (
    <div className="fixed left-1/2 z-50 -translate-x-1/2 bottom-[104px] md:bottom-6 w-[calc(100%-2rem)] max-w-md animate-fade-up">
      {/* Strefa „żywa" TYLKO dla zmian stanu (start/koniec przerwy).
          Licznik odliczający musi mieć aria-live="off" — inaczej czytnik
          ekranowy ogłaszałby „1:30, 1:29, 1:28…” co sekundę. */}
      <span className="sr-only" role="status" aria-live="polite">
        {finished
          ? 'Przerwa zakończona. Możesz zacząć kolejną serię.'
          : timer.paused
            ? 'Przerwa wstrzymana.'
            : active
              ? 'Przerwa trwa.'
              : ''}
      </span>

      <div
        className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 shadow-2xl backdrop-blur-xl sm:gap-3 sm:px-3 ${
          finished
            ? 'border-emerald-400/40 bg-[#0f2a1e]/95'
            : 'border-cyan-400/30 bg-[#0b1730]/95'
        }`}
      >
        {/* Pierścień postępu + czas */}
        <div
          className="relative flex-shrink-0 items-center justify-center"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className="absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-white/10"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * RING_R}
              strokeDashoffset={2 * Math.PI * RING_R * (1 - ratio)}
              className={`${ringColor} transition-[stroke-dashoffset] duration-300`}
            />
          </svg>
          <span
            aria-live="off"
            aria-label={finished ? 'Przerwa zakończona' : `Pozostało ${formatDuration(left)}`}
            className={`absolute inset-0 flex items-center justify-center text-[15px] font-extrabold tabular-nums ${
              finished ? 'text-emerald-300' : 'text-white'
            }`}
          >
            {finished ? '✓' : formatDuration(left)}
          </span>
        </div>

        {/* Opis */}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${finished ? 'text-emerald-200' : 'text-white'}`}>
            {label}
          </p>
          <p className="truncate text-[11px] text-slate-400">{subLabel}</p>
        </div>

        {/* Akcje — 44 px (minimum Apple), najczęstsza akcja wyróżniona */}
        {!finished && (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              onClick={() => addRestTimerSeconds(15)}
              aria-label="Dodaj 15 sekund"
              className="flex h-11 min-w-[76px] items-center justify-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/20 px-3 text-sm font-bold text-cyan-100 transition-colors hover:bg-cyan-500/30 active:scale-95 cursor-pointer"
            >
              <span className="text-base leading-none">+</span>
              <span>15 s</span>
            </button>

            {timer.paused ? (
              <button
                onClick={resumeRestTimer}
                aria-label="Wznów przerwę"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-white transition-colors hover:bg-cyan-400 active:scale-95 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M8 5.14v13.72L19 12 8 5.14z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={pauseRestTimer}
                aria-label="Wstrzymaj przerwę"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition-colors hover:bg-white/15 active:scale-95 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                </svg>
              </button>
            )}

            {/* Zamknięcie przerwy — akcja „nieodwracalna”, więc wygląda
                najspokojniej (niższa krycia, mniejsza ikona). */}
            <button
              onClick={stopRestTimer}
              aria-label="Zatrzymaj przerwę"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200 active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {finished && (
          <button
            onClick={dismissFinished}
            className="flex h-11 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/25 active:scale-95 cursor-pointer"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
}
