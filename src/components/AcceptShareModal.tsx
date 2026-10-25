import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { SharedWorkout } from '../types';
import { getMondayOf, formatWeekLabel, DAY_NAMES } from '../store/weekStore';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

/** Zbuduj dzisiejszą datę jako lokalny `YYYY-MM-DD` (nigdy `toISOString` — to UTC). */
function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `2026-10-27` → `27.10.2026` */
function formatDatePL(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** `2026-10-27T…` → `27.10.2026` */
function formatTimestampPL(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

interface AcceptShareModalProps {
  share: SharedWorkout;
  /** Zapisuje ćwiczenia i oznacza udostępnienie jako zaakceptowane. */
  onAccept: (targetDateStr: string) => Promise<{ error: Error | null }>;
  /** Odrzuca udostępnienie — nic nie trafia do planu. */
  onDecline: () => Promise<{ error: Error | null }>;
  onClose: () => void;
}

export default function AcceptShareModal({ share, onAccept, onDecline, onClose }: AcceptShareModalProps) {
  const [targetDateStr, setTargetDateStr] = useState<string>(todayLocal());
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTo, setAcceptedTo] = useState<string | null>(null);

  // Wysokość klawiatury ekranowej — na iPhone modal musi się podnieść,
  // bo `position: fixed` nie reaguje na otwarcie klawiatury.
  const keyboardInset = useKeyboardInset();

  const exercises = Array.isArray(share.day_data?.exercises) ? share.day_data.exercises : [];
  const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);

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

  // ── Pochodne z wybranej daty ──
  const targetDate = targetDateStr ? new Date(`${targetDateStr}T00:00:00`) : null;
  const isValid = !!targetDate && !isNaN(targetDate.getTime());
  const targetMonday = isValid ? getMondayOf(targetDate as Date) : null;
  const targetIdx = isValid ? ((targetDate as Date).getDay() + 6) % 7 : -1;

  const senderLabel = share.owner_name?.trim() || share.owner_email;

  const handleAccept = async () => {
    if (!isValid || busy) return;
    setBusy('accept');
    setError(null);
    try {
      const result = await onAccept(targetDateStr);
      if (result.error) {
        setError(result.error.message);
      } else {
        setAcceptedTo(targetDateStr);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się dodać treningu.');
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
        setError(result.error.message);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się odrzucić udostępnienia.');
    } finally {
      setBusy(null);
    }
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
          <h2 className="text-white font-bold text-base sm:text-lg">
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 mb-4 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-green-500">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h3 className="text-slate-800 font-bold text-base sm:text-lg">
              Dodano do {targetIdx >= 0 ? DAY_NAMES[targetIdx] : ''}
            </h3>
            <p className="text-slate-500 text-sm mt-2">{formatDatePL(acceptedTo)}</p>
            <p className="text-slate-400 text-xs mt-3 leading-relaxed">
              Trening jest już w Twoim planie — stan serii (✓) zaczyna od zera, wagi i powtórzenia zostały zachowane jako referencja.
            </p>

            <button
              onClick={onClose}
              className="mt-5 w-full px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 active:opacity-80 cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            {/* Content */}
            <div
              className="p-4 space-y-4 overflow-y-auto flex-1"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              {/* Nadawca */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {(senderLabel || '?').trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                    Udostępnił
                  </p>
                  <p className="text-slate-800 font-bold text-sm truncate">{senderLabel}</p>
                  {formatTimestampPL(share.created_at) && (
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {formatTimestampPL(share.created_at)}
                    </p>
                  )}
                </div>
              </div>

              {/* Zawartość dnia */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-1">
                  {share.day_name ?? 'Dzień treningowy'}
                </p>
                <p className="text-slate-800 font-bold text-sm sm:text-base">
                  {exercises.length} ćwiczeń
                  {totalSets > 0 && <span className="text-slate-400 font-normal"> · {totalSets} serii</span>}
                </p>

                <ul className="mt-2 space-y-0.5">
                  {exercises.map((ex, i) => (
                    <li key={`${ex.name}-${i}`} className="text-xs text-slate-500 truncate">
                      • {ex.name}
                      {ex.sets ? ` — ${ex.sets} × ${ex.reps ?? ''}`.trim() : ''}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Wybór dnia docelowego */}
              <div>
                <label htmlFor="accept-share-date" className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2 cursor-pointer">
                  W którym dniu wykonać ten trening?
                </label>
                <input
                  id="accept-share-date"
                  type="date"
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 text-base sm:text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />

                {isValid && targetMonday ? (
                  <div className="mt-3 bg-violet-50 rounded-xl p-3 border border-violet-100">
                    <p className="text-slate-800 font-semibold text-sm">
                      {DAY_NAMES[targetIdx]}
                      <span className="text-slate-400 font-normal"> · </span>
                      <span className="text-slate-500 font-normal text-xs">{formatWeekLabel(targetMonday)}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ćwiczenia zostaną doklejone do tego dnia — jeśli coś tam już masz, nic nie zostanie nadpisane.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 mt-2">Wybierz poprawną datę</p>
                )}
              </div>

              {/* Błąd */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <p className="text-red-600 text-xs leading-relaxed">{error}</p>
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
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 cursor-pointer"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {busy === 'accept' ? 'Dodaję…' : 'Akceptuj i dodaj'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
