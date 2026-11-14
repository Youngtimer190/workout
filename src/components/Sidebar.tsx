import React, { useState } from 'react';
import { View } from '../types';
import logoUrl from '../assets/fitplanner-logo.png';
import MobileMoreSheet from './MobileMoreSheet';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  ClockIcon,
  LogOutIcon,
  MoreIcon,
  SettingsIcon,
  StarIcon,
  SunIcon,
  TrophyIcon,
} from './icons';

/**
 * Sidebar aplikacji.
 *
 * Struktura (zgodnie z makietą redesignu):
 *  1. Panel z logo — z poświatą w narożniku,
 *  2. Nawigacja główna — aktywna pozycja jako gradientowy „pigułek”,
 *  3. Sekcja „Szybki dostęp” — ulubione ćwiczenia i ostatnie treningi,
 *  4. Falująca linia + karta postępu „Twoja forma na wyższym poziomie!”,
 *  5. Sekcja konta — rozwijane menu (Ustawienia / Wygląd / Pomoc / Wyloguj).
 */

interface SidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
  /** Liczba udostępnień czekających na akceptację — do badge'a. */
  pendingCount?: number;
  /** Procent ukończonych serii w przeglądanym tygodniu (0-100). */
  progress?: number;
  /** Podpis pod paskiem postępu (np. „Ukończone serie · 9 – 15 lis 2026”). */
  progressLabel?: string;
  /** Liczba ulubionych ćwiczeń. */
  favoriteCount?: number;
  /**
   * Zalogowany użytkownik.
   *
   * Przekazujemy go z `App` zamiast brać z `useAuthStore()` — każde wywołanie
   * hooka tworzy własną instancję stanu, więc sidebar nie widziałby sesji
   * (ani trybu demo) zapamiętanej w `App`.
   */
  user?: { email?: string; user_metadata?: { full_name?: string } } | null;
  /** Wylogowanie (przekazane z `App` — patrz `user`). */
  onSignOut?: () => void;
  /** Ostatnio zarejestrowany trening (tydzień, dzień, nazwa). */
  lastWorkout?: { weekKey: string; dayIndex: number; dayName: string } | null;
  /** Przenosi do ostatnio zarejestrowanego treningu w planerze. */
  onGoToLastWorkout?: () => void;
}

const navItems: { id: View; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Przegląd',
    shortLabel: 'Start',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'generator',
    label: 'Generator',
    shortLabel: 'Generator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'planner',
    label: 'Planer',
    shortLabel: 'Planer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    id: 'library',
    label: 'Ćwiczenia',
    shortLabel: 'Baza',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 6h16M4 10h16M4 14h10" />
        <circle cx="17" cy="17" r="3" />
        <path d="M21 21l-1.5-1.5" />
      </svg>
    ),
  },
  {
    id: 'templates',
    label: 'Moje treningi',
    shortLabel: 'Treningi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'stats',
    label: 'Statystyki',
    shortLabel: 'Stats',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 3v18h18" />
        <path d="M18 9l-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    id: 'shares',
    label: 'Udostępnienia',
    shortLabel: 'Udost.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
];

/**
 * Pozycje rozwiniętego menu konta — używane zarówno w desktopowym pasku
 * bocznym, jak i w mobilnym menu (bottom nav).
 */
function AccountMenuRows({
  onGo,
  onSignOut,
}: {
  onGo: (view: View) => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <button
        onClick={() => onGo('settings')}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <SettingsIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <span className="flex-1">Ustawienia</span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
      </button>
      <button
        onClick={() => onGo('appearance')}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <SunIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <span className="flex-1">Wygląd</span>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
      </button>
      <button
        onClick={() => onGo('help')}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <CircleHelpIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <span className="flex-1">Pomoc i wsparcie</span>
      </button>
      <div className="border-t border-cyan-400/10">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <LogOutIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span className="flex-1">Wyloguj się</span>
          <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />
        </button>
      </div>
    </>
  );
}

/**
 * Kolejność pozycji w pływającym docku (mobile).
 *
 * Cztery najczęściej używane widoki + „Więcej" (arkusz z resztą).
 * Dzięki temu na 390 px każda pozycja ma ~78 px zamiast 48 px.
 */
const MOBILE_ORDER: View[] = ['dashboard', 'planner', 'library', 'generator'];

export default function Sidebar({
  activeView,
  onViewChange,
  pendingCount = 0,
  progress = 0,
  progressLabel = 'Ukończone serie w tym tygodniu',
  favoriteCount = 0,
  user = null,
  onSignOut,
  lastWorkout = null,
  onGoToLastWorkout,
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isSignedIn = !!user;
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Użytkownik';
  const email = user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const go = (view: View) => {
    onViewChange(view);
    setMenuOpen(false);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    setMoreOpen(false);
    onSignOut?.();
  };

  /** Pozycje w pływającym docku (mobile). */
  const mobileItems = MOBILE_ORDER
    .map(id => navItems.find(i => i.id === id))
    .filter((i): i is (typeof navItems)[number] => !!i);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-72 bg-[#0b1533]/85 backdrop-blur-xl border-r border-cyan-400/15 fixed left-0 top-0 z-20"
        style={{ height: '100dvh' }}
      >
        {/* ── 1. Panel z logo ── */}
        <div className="relative mx-3 mt-3 mb-5 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/12 via-white/[0.02] to-cyan-400/10 px-4 py-4 flex-shrink-0">
          {/* poświata w prawym górnym rogu */}
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-500/30 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <img
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="h-11 w-auto flex-shrink-0 drop-shadow-[0_0_18px_rgba(6,182,212,0.65)]"
            />
            <div className="min-w-0">
              <p className="font-extrabold text-white text-lg leading-none tracking-tight">FitPlanner</p>
              <p className="text-[11px] text-slate-400 leading-tight mt-1.5">Twój osobisty trener w kieszeni</p>
            </div>
          </div>
        </div>

        {/* ── 2. Nawigacja główna ── */}
        <nav className="flex flex-col gap-1 px-3 flex-1 overflow-y-auto min-h-0">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-[0_10px_28px_-12px_rgba(6,182,212,1)]'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {/* znacznik aktywnej pozycji przy prawej krawędzi */}
                {isActive && (
                  <span className="absolute -right-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-white/80" />
                )}
                <span className="relative flex-shrink-0">
                  {item.icon}
                  {item.id === 'shares' && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0b1533]">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}

          {/* ── 3. Szybki dostęp ── */}
          <div className="mt-6 mb-2 px-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Szybki dostęp</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => go('favorites')}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-left transition-all duration-200 cursor-pointer hover:border-cyan-400/30 hover:bg-white/[0.06]"
            >
              <StarIcon className="h-[18px] w-[18px] text-cyan-300 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-slate-200">
                Ulubione ćwiczenia
                {favoriteCount > 0 && (
                  <span className="ml-2 text-[11px] font-bold text-cyan-300">{favoriteCount}</span>
                )}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
            </button>
            <button
              onClick={() => onGoToLastWorkout?.()}
              disabled={!lastWorkout}
              title={lastWorkout ? `Przejdź do: ${lastWorkout.dayName}` : 'Brak zarejestrowanych treningów'}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 ${
                lastWorkout
                  ? 'border-white/[0.07] bg-white/[0.03] cursor-pointer hover:border-cyan-400/30 hover:bg-white/[0.06]'
                  : 'border-white/[0.04] bg-white/[0.02] cursor-not-allowed opacity-50'
              }`}
            >
              <ClockIcon className="h-[18px] w-[18px] text-slate-300 flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-slate-200">Ostatni trening</span>
                {lastWorkout && (
                  <span className="block text-[11px] leading-tight text-slate-500 truncate">{lastWorkout.dayName}</span>
                )}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
            </button>
          </div>

          {/* ── 4. Falująca linia (przyciśnięta do dołu sekcji) ── */}
          <div className="mt-auto pt-4 flex-shrink-0" aria-hidden="true">
            <svg viewBox="0 0 260 40" preserveAspectRatio="none" className="h-10 w-full">
              <defs>
                <linearGradient id="sidebar-wave" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
                  <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 26 C 40 6, 80 34, 120 20 S 210 2, 260 18"
                fill="none"
                stroke="url(#sidebar-wave)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* ── 5. Karta postępu ── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 mb-4 flex-shrink-0">
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
              <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-9 text-right text-xs font-bold text-slate-300">{progress}%</span>
            </div>
            <p className="relative mt-2 text-[10px] leading-snug text-slate-500">
              {progressLabel}
            </p>
          </div>
        </nav>

        {/* ── 6. Sekcja konta ── */}
        <div className="border-t border-cyan-400/10 px-3 py-3 flex-shrink-0">
          {isSignedIn ? (
            <>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                  menuOpen ? 'bg-white/[0.06]' : 'hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-xs font-bold text-white shadow-[0_8px_20px_-10px_rgba(6,182,212,1)]">
                  {initials}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold leading-tight text-white">{displayName}</span>
                  <span className="block truncate text-[11px] leading-tight text-slate-400">{email}</span>
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {menuOpen && (
                <div className="mt-2 max-h-[55vh] overflow-y-auto overscroll-contain overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0f1f42]/95 backdrop-blur-xl shadow-2xl animate-fade-in">
                  <div className="flex items-center gap-3 border-b border-cyan-400/10 px-4 py-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 text-sm font-bold text-white">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="truncate text-[11px] text-slate-400">{email}</p>
                    </div>
                  </div>

                  <AccountMenuRows
                    onGo={go}
                    onSignOut={() => handleSignOut()}
                  />
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">© 2026 FitPlanner</p>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Dock (pływający) ── */}
      <nav
        className="md:hidden fixed left-3 right-3 z-30"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch gap-1 rounded-3xl border border-white/10 bg-[#0b1533]/92 px-1.5 py-1.5 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          {mobileItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className="dock-item group flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors active:bg-white/[0.06]"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-[0_8px_20px_-8px_rgba(6,182,212,1)]'
                      : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`text-[10px] font-semibold leading-none transition-colors duration-200 ${
                    isActive ? 'text-cyan-300' : 'text-slate-500'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* Więcej — otwiera arkusz z pozostałymi widokami */}
          <button
            onClick={() => setMoreOpen(true)}
            className="dock-item group flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 transition-colors active:bg-white/[0.06]"
            aria-label="Więcej opcji"
            aria-expanded={moreOpen}
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200">
              <MoreIcon className="h-5 w-5" />
              {pendingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-cyan-400 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold leading-none text-slate-500">Więcej</span>
          </button>
        </div>
      </nav>

      {/* ── Arkusz „Więcej" ── */}
      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onViewChange={onViewChange}
        user={user}
        onSignOut={onSignOut}
        lastWorkout={lastWorkout}
        onGoToLastWorkout={onGoToLastWorkout}
        progress={progress}
        progressLabel={progressLabel}
        pendingCount={pendingCount}
      />
    </>
  );
}
