import React from 'react';
import { View } from '../types';
import UserMenu from './auth/UserMenu';
import { useAuthStore } from '../store/authStore';

interface SidebarProps {
  activeView: View;
  onViewChange: (v: View) => void;
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
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { isConfigured, isAuthenticated } = useAuthStore();

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 shadow-sm fixed left-0 top-0 z-20"
        style={{ height: '100dvh' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M6 4v6a6 6 0 0012 0V4" />
              <path d="M4 4h2M18 4h2M4 20h16" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base leading-tight">FitPlaner</p>
            <p className="text-xs text-slate-400">Twój planer treningów</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === item.id
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User / Footer */}
        <div className="px-3 py-4 border-t border-slate-100 flex-shrink-0">
          {isConfigured && isAuthenticated ? (
            <UserMenu />
          ) : (
            <p className="text-xs text-slate-400 text-center">© 2025 FitPlaner</p>
          )}
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100"
        style={{
          boxShadow: '0 -2px 20px rgba(0,0,0,0.07)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch">
          {navItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className="bottom-nav-btn"
                aria-label={item.label}
              >
                {/* Icon */}
                <span className={`transition-all duration-200 ${
                  isActive ? 'text-violet-600 scale-110' : 'text-slate-400'
                }`}>
                  {item.icon}
                </span>
                {/* Label */}
                <span className={`text-[10px] font-semibold leading-none transition-all duration-200 ${
                  isActive ? 'text-violet-600' : 'text-slate-400'
                }`}>
                  {item.shortLabel}
                </span>
                {/* Active dot */}
                {isActive && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
