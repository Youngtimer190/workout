import { useEffect, useRef, useState } from 'react';
import { View } from '../types';
import {
  ArrowRightIcon,
  CalendarIcon,
  ChartIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  ClockIcon,
  DumbbellIcon,
  LogOutIcon,
  SettingsIcon,
  StarIcon,
  SunIcon,
  TrophyIcon,
  XIcon,
} from './icons';

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  onViewChange: (view: View) => void;
  /** Zalogowany użytkownik (przekazywany z `App`). */
  user?: { email?: string; user_metadata?: { full_name?: string } } | null;
  onSignOut?: () => void;
  /** Ostatnio zarejestrowany trening — dla skrótu „Ostatni trening”. */
  lastWorkout?: { weekKey: string; dayIndex: number; dayName: string } | null;
  onGoToLastWorkout?: () => void;
  /** Procent ukończonych serii w przeglądanym tygodniu. */
  progress?: number;
  /** Podpis pod paskiem postępu. */
  progressLabel?: string;
  /** Liczba udostępnień czekających na akceptację — badge przy „Udostępnienia”. */
  pendingCount?: number;
}

/**
 * Arkusz „Więcej" na telefonie.
 *
 * Jest mobilną wersją desktopowego paska bocznego — ta sama kolejność
 * (konto → planowanie → szybki dostęp → postęp) i ten sam język wizualny,
 * dzięki czemu nawigacja jest spójna na obu platformach.
 */
export default function MobileMoreSheet({
  open,
  onClose,
  onViewChange,
  user,
  onSignOut,
  lastWorkout,
  onGoToLastWorkout,
  progress = 0,
  progressLabel = 'Ukończone serie w tym tygodniu',
  pendingCount = 0,
}: MobileMoreSheetProps) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragOffset = useRef(0);

  // Zamknij przyciskiem Escape + blokada przewijania tła
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Po otwarciu arkusza wyzeruj stan gestu
  useEffect(() => {
    if (!open) return;
    dragStartY.current = null;
    dragOffset.current = 0;
    setClosing(false);
  }, [open]);

  if (!open) return null;

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Użytkownik';
  const email = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const go = (view: View) => { onViewChange(view); onClose(); };

  const rowClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.07] active:bg-white/[0.1]';

  const sectionLabel =
    'px-1 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500';

  /* ── Gest zamykania: TYLKO uchwyt na górze ──────────────────────────────────
     Treść arkusza musi swobodnie się przewijać, więc obsługa gestu
     przeciągania żyje wyłącznie na uchwacie. Dzięki temu przewijanie
     listy w dół nie przesuwa arkusza i go nie zamyka. */
  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragOffset.current = 0;
  };

  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = Math.max(0, e.touches[0].clientY - dragStartY.current);
    dragOffset.current = dy;
    // Bez setState — bez przerysowywania całego arkusza przy każdym ruchu palca
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };

  const onHandleTouchEnd = () => {
    const dy = dragOffset.current;
    dragStartY.current = null;
    dragOffset.current = 0;

    if (dy > 90) {
      setClosing(true);
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.22s cubic-bezier(0.4,0,1,1)';
        sheetRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(onClose, 200);
    } else if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 0.24s cubic-bezier(0.22,1,0.36,1)';
      sheetRef.current.style.transform = 'translateY(0)';
    }
  };

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Więcej opcji">
      {/* Tło */}
      <div className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-sm" onClick={onClose} />

      {/* Arkusz — uchwyt przyklejony u góry, treść przewijana osobno */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-cyan-400/20 bg-[#0c1733]/97 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl ${
          closing ? '' : 'animate-sheet-up'
        }`}
      >
        {/* Uchwyt — jedyny element obsługujący gest zamknięcia */}
        <div
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          onTouchCancel={onHandleTouchEnd}
          className="sheet-handle relative flex shrink-0 items-center justify-between px-5 pt-3 pb-1"
        >
          <div className="mx-auto h-1 w-11 rounded-full bg-white/25" />
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300 transition-colors active:bg-white/10"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Treść — przewijana niezależnie od gestu zamykania */}
        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">

          {/* Konto */}
          {user && (
            <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-white/[0.04] p-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(6,182,212,1)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-[11px] text-slate-400">{email}</p>
              </div>
            </div>
          )}

          {/* Planowanie */}
          <p className={sectionLabel}>Planowanie</p>
          <div className="space-y-1 px-4">
            <button onClick={() => go('templates')} className={rowClass}>
              <DumbbellIcon className="h-[18px] w-[18px] flex-shrink-0 text-cyan-300" />
              <span className="flex-1">Moje treningi</span>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
            <button onClick={() => go('stats')} className={rowClass}>
              <ChartIcon className="h-[18px] w-[18px] flex-shrink-0 text-cyan-300" />
              <span className="flex-1">Statystyki</span>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
            <button onClick={() => go('shares')} className={rowClass}>
              <CalendarIcon className="h-[18px] w-[18px] flex-shrink-0 text-cyan-300" />
              <span className="flex-1">Udostępnienia</span>
              {pendingCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-400 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
          </div>

          {/* Szybki dostęp */}
          <p className={sectionLabel}>Szybki dostęp</p>
          <div className="space-y-1 px-4">
            <button onClick={() => go('favorites')} className={rowClass}>
              <StarIcon className="h-[18px] w-[18px] flex-shrink-0 text-amber-300" />
              <span className="flex-1">Ulubione ćwiczenia</span>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
            <button
              onClick={() => { onClose(); onGoToLastWorkout?.(); }}
              disabled={!lastWorkout}
              className={`${rowClass} ${lastWorkout ? '' : 'opacity-50'}`}
            >
              <ClockIcon className="h-[18px] w-[18px] flex-shrink-0 text-slate-300" />
              <span className="flex-1">
                Ostatni trening
                {lastWorkout && (
                  <span className="block text-[11px] leading-tight text-slate-500">{lastWorkout.dayName}</span>
                )}
              </span>
              {lastWorkout && <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />}
            </button>
          </div>

          {/* Postęp */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-500/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-400/15 text-amber-300">
                <TrophyIcon className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold leading-tight text-white">
                Twoja forma
                <br />
                na wyższym poziomie!
              </p>
            </div>
            <div className="relative mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs font-bold text-slate-300">{progress}%</span>
            </div>
            <p className="relative mt-2 text-[10px] leading-snug text-slate-500">{progressLabel}</p>
          </div>

          {/* Konto */}
          <p className={sectionLabel}>Konto</p>
          <div className="space-y-1 px-4">
            <button onClick={() => go('settings')} className={rowClass}>
              <SettingsIcon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
              <span className="flex-1">Ustawienia</span>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
            <button onClick={() => go('appearance')} className={rowClass}>
              <SunIcon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
              <span className="flex-1">Wygląd</span>
              <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
            </button>
            <button onClick={() => go('help')} className={rowClass}>
              <CircleHelpIcon className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
              <span className="flex-1">Pomoc i wsparcie</span>
            </button>
            <button
              onClick={() => { onClose(); onSignOut?.(); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
            >
              <LogOutIcon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1">Wyloguj się</span>
              <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-red-400/70" />
            </button>
          </div>

          {/* Odstęp na pasek bezpieczeństwa */}
          <div className="h-[max(1rem,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    </div>
  );
}
