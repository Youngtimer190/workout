import React, { useState } from 'react';
import { View } from '../types';
import logoUrl from '../assets/fitplanner-logo.png';
import athleteUrl from '../assets/sidebar-athlete.jpg';
import MobileMoreSheet from './MobileMoreSheet';
import {
  ArrowRightIcon,
  CalendarPlanIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  ClockIcon,
  DumbbellFlatIcon,
  FolderIcon,
  GridIcon,
  LogOutIcon,
  MoreIcon,
  SettingsIcon,
  ShareIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
  TrendChartIcon,
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

/**
 * Nawigacja główna.
 *
 * Ikony pochodzą ze wspólnego zestawu (`icons.tsx`) — dzięki temu mają
 * ten sam obrys (1.8), ten sam styl i tę samą wagę wizualną co reszta
 * aplikacji. Wcześniej nawigacja miała własne, „wtopione" SVG.
 */
const navItems: { id: View; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Przegląd',
    shortLabel: 'Start',
    icon: <GridIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'generator',
    label: 'Generator',
    shortLabel: 'Generator',
    icon: <SparklesIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'planner',
    label: 'Planer',
    shortLabel: 'Planer',
    icon: <CalendarPlanIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'library',
    label: 'Ćwiczenia',
    shortLabel: 'Baza',
    icon: <DumbbellFlatIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'templates',
    label: 'Moje treningi',
    shortLabel: 'Treningi',
    icon: <FolderIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'stats',
    label: 'Statystyki',
    shortLabel: 'Stats',
    icon: <TrendChartIcon className="h-[22px] w-[22px]" />,
  },
  {
    id: 'shares',
    label: 'Udostępnienia',
    shortLabel: 'Udost.',
    icon: <ShareIcon className="h-[22px] w-[22px]" />,
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
        className="hidden md:flex flex-col w-[var(--sidebar-width)] bg-[linear-gradient(180deg,#0b1a3d_0%,#071231_48%,#061a30_100%)] border-r border-cyan-400/15 fixed left-0 top-0 z-20 overflow-hidden"
        style={{ height: '100dvh' }}
      >
        {/* ── Warstwa dekoracyjna: poświata + fotografia mężczyzny ──
            Warstwa leży POD treścią (`pointer-events-none`), a gradienty
            na wierzchu pilnują czytelności napisów. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* poświata akcentu w prawym górnym rogu */}
          <div className="absolute inset-0 bg-[radial-gradient(620px_380px_at_88%_-12%,rgba(34,211,238,0.22),transparent_70%)]" />

          {/* Fotografia mężczyzny — dolna część panelu, jak w designie.
              `isolate` izoluje mieszanie kolorów, żeby poświaty nie
              oddziaływały na treść panelu. */}
          <div className="absolute inset-x-0 bottom-0 top-[44%] overflow-hidden isolate">
            <img
              src={athleteUrl}
              alt=""
              className="sidebar-photo h-full w-full object-cover object-center opacity-[0.95]"
            />
            {/* przyciemnienie pod kolumnę tekstu + rozjaśnienie na prawej */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,42,0.93)_0%,rgba(6,17,42,0.74)_38%,rgba(6,17,42,0.26)_68%,rgba(6,17,42,0)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,42,0.55)_0%,rgba(6,17,42,0.10)_10%,rgba(6,17,42,0)_42%,rgba(6,17,42,0.66)_100%)]" />
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* ── 1. Panel z logo ── */}
        <div className="relative flex items-center gap-3 px-4 pt-5 pb-4 flex-shrink-0 xl:px-5 xl:pt-6">
          {/* poświata w prawym górnym rogu */}
          <div className="pointer-events-none absolute left-2 top-2 h-24 w-24 rounded-full bg-cyan-500/20 blur-2xl" />
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            className="relative h-10 w-auto flex-shrink-0 drop-shadow-[0_0_18px_rgba(6,182,212,0.65)] xl:h-12"
          />
          <div className="relative min-w-0">
            <p className="font-extrabold text-white text-lg leading-none tracking-tight xl:text-xl">
              FitPlanner
            </p>
            {/* Podpis schodzi przy węższych panelach (tablety) — tam
                nie ma miejsca, a wiersz potrafi się zawijać. */}
            <p className="hidden xl:block text-[11px] text-slate-400 leading-tight mt-1.5">
              Twój osobisty trener w kieszeni
            </p>
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
                className={`group relative flex items-center gap-3 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-400 to-cyan-600 text-white shadow-[0_10px_30px_-10px_rgba(34,211,238,0.8)]'
                    : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                {/* znacznik aktywnej pozycji przy lewej krawędzi.
                    UWAGA: `bg-white` jest w motywie ciemnym przekolorowywane
                    na granat (`.app-theme .bg-white`) — tu potrzebny jest
                    jawny biały. */}
                {isActive && (
                  <span className="absolute -left-1 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#ffffff]" />
                )}
                {/* ikona w kółku — aktywna pozycja dostaje ciemne tło */}
                <span
                  className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                    isActive ? 'bg-black/25' : ''
                  }`}
                >
                  {item.icon}
                  {item.id === 'shares' && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0b1a3d]">
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
              className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#0a1a3d]/75 px-3.5 py-2.5 text-left backdrop-blur-md transition-all duration-200 cursor-pointer hover:border-cyan-400/40 hover:bg-[#0d2046]/80"
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
                  ? 'border-white/[0.12] bg-[#0a1a3d]/75 cursor-pointer hover:border-cyan-400/40 hover:bg-[#0d2046]/80'
                  : 'border-white/[0.06] bg-[#0a1a3d]/70 cursor-not-allowed'
              }`}
            >
              <ClockIcon className="h-[18px] w-[18px] text-slate-400 flex-shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-slate-300">Ostatni trening</span>
                {lastWorkout && (
                  <span className="block text-[11px] leading-tight text-slate-500 truncate">{lastWorkout.dayName}</span>
                )}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
            </button>
          </div>

          {/* ── 4. Falująca linia (przyciśnięta do dołu sekcji) ──
              Na krótkich ekranach (laptop w orientacji poziomej, tablet)
              fala jest zbędna — karta postępu musi się zmieścić. */}
          <div className="mt-auto pt-4 flex-shrink-0 [@media(max-height:880px)]:hidden" aria-hidden="true">
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
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0a1a3d]/75 p-3.5 mb-4 flex-shrink-0 backdrop-blur-md xl:p-4 [@media(max-height:880px)]:p-3">
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

        {/* ── 6. Sekcja konta ──
            Ma własne, pełne tło — fotografia z tła kończy się dokładnie
            na linii rozdzielającej, tak jak w designie. */}
        <div className="border-t border-cyan-400/25 bg-[#081632] px-3 py-3 flex-shrink-0">
          {isSignedIn ? (
            <>
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-expanded={menuOpen}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors ${
                  menuOpen ? 'bg-white/[0.06]' : 'hover:bg-white/[0.05]'
                }`}
              >
                <span className="flex h-9 min-w-[3.25rem] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 px-3 text-xs font-bold text-white shadow-[0_6px_18px_-8px_rgba(45,212,191,0.9)]">
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
                <div className="mt-2 max-h-[55vh] overflow-y-auto overscroll-contain overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0a1a3d]/95 backdrop-blur-xl shadow-2xl animate-fade-in">
                  <div className="flex items-center gap-3 border-b border-cyan-400/10 px-4 py-3">
                    <span className="flex h-10 min-w-[3.5rem] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 px-3 text-sm font-bold text-white">
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
        </div>
      </aside>

      {/* ── Mobile Bottom Dock (pływający) ── */}
      <nav
        className="md:hidden fixed left-3 right-3 z-30"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-stretch gap-1 rounded-3xl border border-white/10 bg-[#0a1a3d]/92 px-1.5 py-1.5 shadow-[0_18px_45px_-18px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
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
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-[0_8px_20px_-8px_rgba(34,211,238,0.9)]'
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
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-all duration-200">
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
