import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { SharedWorkout } from '../types';
import { getMondayOf, formatWeekLabel, DAY_NAMES } from '../store/weekStore';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { CheckIcon, ChevronRightIcon } from './icons';
import {
  WEEKDAYS_SHORT,
  formatDatePL,
  formatRelativePL,
  pluralExercise,
  pluralSet,
  toLocalDateStr,
} from '../lib/format';
import { toUserMessage } from '../lib/errorMessages';

const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/** Ile dni do pokazania w pickerze. */
const DAYS_AHEAD = 14;

interface AcceptShareModalProps {
  share: SharedWorkout;
  /** Data (`YYYY-MM-DD`) → liczba ćwiczeń już w tym dniu. */
  busyDates?: Record<string, number>;
  /** Zapisuje ćwiczenia i oznacza udostępnienie jako zaakceptowane. */
  onAccept: (targetDateStr: string) => Promise<{ error: Error | null }>;
  /** Odrzuca udostępnienie — nic nie trafia do planu. */
  onDecline: () => Promise<{ error: Error | null }>;
  /** Po akceptacji — otwórz Planer (tam lądował trening). */
  onOpenPlanner?: () => void;
  onClose: () => void;
}

export default function AcceptShareModal({
  share,
  busyDates,
  onAccept,
  onDecline,
  onOpenPlanner,
  onClose,
}: AcceptShareModalProps) {
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTo, setAcceptedTo] = useState<string | null>(null);

  // Wysokość klawiatury ekranowej — na iPhone modal musi się podnieść,
  // bo `position: fixed` nie reaguje na otwarcie klawiatury.
  const keyboardInset = useKeyboardInset();

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  const exercises = Array.isArray(share.day_data?.exercises) ? share.day_data.exercises : [];
  const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const senderLabel = share.owner_name?.trim() || share.owner_email;
  const rel = formatRelativePL(share.created_at);

  /**
   * Kalendarz wyboru dnia — następne 14 dni.
   *
   * Zamiast surowego `<input type="date">` (który na telefonie otwiera natywny
   * picker i nie pokazuje od razu tygodnia ani zajętości dnia) pokazujemy
   * siatkę dni z tygodniem, liczbą ćwiczeń i znacznikiem „dzień zajęty”.
   */
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDateStr(d);
      return {
        date: key,
        weekday: WEEKDAYS_SHORT[(d.getDay() + 6) % 7],
        dayNum: d.getDate(),
        month: MONTHS_SHORT[d.getMonth()],
        isToday: i === 0,
        isTomorrow: i === 1,
        busy: busyDates?.[key] ?? 0,
      };
    });
  }, [busyDates]);

  // Domyślnie wybieramy PIERWSZY WOLNY dzień (dziś, jeśli jest wolny).
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDateStr(d);
      if (!busyDates?.[key]) return key;
    }
    return toLocalDateStr(start);
  });

  const targetDate = targetDateStr ? new Date(`${targetDateStr}T00:00:00`) : null;
  const isValid = !!targetDate && !isNaN(targetDate.getTime());
  const targetMonday = isValid ? getMondayOf(targetDate as Date) : null;
  const targetIdx = isValid ? ((targetDate as Date).getDay() + 6) % 7 : -1;
  const targetBusy = busyDates?.[targetDateStr] ?? 0;

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

  // Fokus na pierwszym elemencie (dla klawiatury i czytników ekranu).
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const handleAccept = async () => {
    if (!isValid || busy) return;
    setBusy('accept');
    setError(null);
    try {
      const result = await onAccept(targetDateStr);
      if (result.error) {
        setError(toUserMessage(result.error, 'Nie udało się dodać treningu.'));
      } else {
        setAcceptedTo(targetDateStr);
      }
    } catch (err: unknown) {
      setError(toUserMessage(err, 'Nie udało się dodać treningu.'));
    } finally {
      setBusy(null);
    }
  };

  const handleDecline = async () => {
    if (busy) return;
    setBusy('decline');
    setError(null);
    try {
      const result = await onDecline();
      if (result.error) {
        setError(toUserMessage(result.error, 'Nie udało się odrzucić udostępnienia.'));
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(toUserMessage(err, 'Nie udało się odrzucić udostępnienia.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-share-title"
        className="bg-white modal-panel w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden modal-sheet animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 id="accept-share-title" className="text-white font-bold text-base sm:text-lg">
            {acceptedTo ? 'Trening dodany' : 'Udostępniony trening'}
          </h2>
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

        {/* ── Ekran sukcesu ── */}
        {acceptedTo ? (
          <div
            className="p-5 sm:p-6 flex flex-col items-center text-center flex-1 overflow-y-auto"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-4 flex-shrink-0">
              <CheckIcon className="w-7 h-7 text-emerald-300" />
            </div>
            <h3 className="text-slate-800 font-bold text-base sm:text-lg">
              Dodano do {targetIdx >= 0 ? DAY_NAMES[targetIdx] : ''}
            </h3>
            <p className="text-slate-500 text-sm mt-2">{formatDatePL(acceptedTo)}</p>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed max-w-xs">
              Trening jest już w Twoim planie — stan serii (zaznaczone serie) zaczyna od zera,
              wagi i powtórzenia zostały zachowane jako referencja.
            </p>

            <div className="mt-5 w-full space-y-2">
              {onOpenPlanner && (
                <button
                  onClick={() => onOpenPlanner()}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 active:opacity-80 cursor-pointer"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Otwórz w Planerze
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50 cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Zamknij
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Content */}
            <div
              className="p-4 space-y-4 overflow-y-auto flex-1"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {/* Nadawca */}
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm uppercase">
                    {(senderLabel || '?').trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                    Udostępnił
                  </p>
                  <p className="text-slate-800 font-bold text-sm truncate">{senderLabel}</p>
                  {rel.text && (
                    <p className="text-slate-400 text-[11px] mt-0.5" title={rel.title}>{rel.text}</p>
                  )}
                </div>
              </div>

              {/* Zawartość dnia */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                  {share.day_name ?? 'Dzień treningowy'}
                </p>
                <p className="text-slate-800 font-bold text-sm sm:text-base">
                  {exercises.length} {pluralExercise(exercises.length)}
                  {totalSets > 0 && <span className="text-slate-400 font-normal"> · {totalSets} {pluralSet(totalSets)}</span>}
                </p>

                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                  {exercises.map((ex, i) => (
                    <li key={`${ex.name}-${i}`} className="flex items-baseline gap-2 text-xs text-slate-300">
                      <span className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400/70" />
                      <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                      {ex.sets ? (
                        <span className="flex-shrink-0 text-[11px] text-slate-500">
                          {ex.sets} × {ex.reps ?? ''}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              {/* ── Wybór dnia docelowego ── */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">
                  W którym dniu wykonać ten trening?
                </label>

                <div className="grid grid-cols-7 gap-1.5">
                  {days.map(d => {
                    const selected = d.date === targetDateStr;
                    return (
                      <button
                        key={d.date}
                        ref={selected ? firstFieldRef : undefined}
                        onClick={() => setTargetDateStr(d.date)}
                        aria-pressed={selected}
                        title={d.busy > 0 ? `${d.busy} ${pluralExercise(d.busy)} w tym dniu` : undefined}
                        className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-xl border transition-all cursor-pointer ${
                          selected
                            ? 'border-violet-400/60 bg-gradient-to-b from-violet-500/35 to-violet-600/20 text-white'
                            : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:border-violet-400/30 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className={`text-[10px] font-semibold ${selected ? 'text-violet-200' : 'text-slate-500'}`}>
                          {d.isToday ? 'Dziś' : d.isTomorrow ? 'Jutro' : d.weekday}
                        </span>
                        <span className="text-base font-bold leading-tight">{d.dayNum}</span>
                        <span className={`text-[9px] ${selected ? 'text-violet-200/80' : 'text-slate-600'}`}>
                          {d.month}
                        </span>
                        {d.busy > 0 && (
                          <span
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                            aria-label="dzień ma już ćwiczenia"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isValid && targetMonday ? (
                  <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
                    <p className="text-slate-800 font-semibold text-sm">
                      {DAY_NAMES[targetIdx]}
                      <span className="text-slate-400 font-normal"> · </span>
                      <span className="text-slate-500 font-normal text-xs">{formatWeekLabel(targetMonday)}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {targetBusy > 0
                        ? `W tym dniu masz już ${targetBusy} ${pluralExercise(targetBusy)} — udostępnione ćwiczenia doklejone zostaną na końcu, nic nie zostanie nadpisane.`
                        : 'Ćwiczenia zostaną doklejone do tego dnia — jeśli coś tam już masz, nic nie zostanie nadpisane.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 mt-2">Wybierz poprawną datę</p>
                )}
              </div>

              {/* Błąd */}
              {error && (
                <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v5" />
                    <path d="M12 16h.01" />
                  </svg>
                  <p className="text-red-200 text-xs leading-relaxed">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0"
              // Home indicator iPhone — przyciski nie mogą pod niego wchodzić
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                onClick={handleDecline}
                disabled={busy !== null}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 active:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {busy === 'decline' ? 'Odrzucam…' : 'Odrzuć'}
              </button>
              <button
                onClick={handleAccept}
                disabled={!isValid || busy !== null}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {busy === 'accept' ? 'Dodaję…' : 'Akceptuj i dodaj'}
                {busy !== 'accept' && <ChevronRightIcon className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
