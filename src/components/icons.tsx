/**
 * Wspólny zestaw ikon aplikacji.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Wszystkie ikony są rysowane w jednym stylu: obrys 24×24, `stroke="currentColor"`,
 * zaokrąglone końce, grubość 1.8. Dzięki temu ekran logowania, Przegląd,
 * Planer i pozostałe widoki wyglądają jak jedna aplikacja (zamiast mieszanki
 * emoji i SVG).
 *
 * Użycie:  <DumbbellIcon className="h-4 w-4 text-violet-300" />
 */

import React from 'react';

export interface IconProps {
  className?: string;
  /** Grubość obrysu (domyślnie 1.8). */
  strokeWidth?: number;
}

/** Wspólne atrybuty SVG — wszystkie ikony korzystają z tego samego stylu. */
function svgProps({ className = 'h-5 w-5', strokeWidth = 1.8 }: IconProps) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/* ── Podstawowe ───────────────────────────────────────────────────────────── */

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function CircleDotIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Nawigacja ────────────────────────────────────────────────────────────── */

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/* ── Akcje ────────────────────────────────────────────────────────────────── */

export function PencilIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 4h10l6 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14 4v6h6" />
      <path d="M7 13h6" />
      <path d="M7 17h4" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect width="13" height="13" x="9" y="9" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function ReplaceIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M7 16V4m0 0L3 8m4-4 4 4" />
      <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  );
}

export function MoveIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </svg>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 4h-7" />
      <path d="M10 4H3" />
      <path d="M21 12h-9" />
      <path d="M8 12H3" />
      <path d="M21 20h-5" />
      <path d="M12 20H3" />
      <path d="M14 2v4" />
      <path d="M8 10v4" />
      <path d="M16 18v4" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4.2-4.2" />
    </svg>
  );
}

/* ── Dane i statystyki ───────────────────────────────────────────────────── */

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 2h4" />
      <path d="M12 14v-3" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 21h18" />
      <path d="M6.5 21v-5" />
      <path d="M11 21V10" />
      <path d="M15.5 21v-7" />
      <path d="m7 9 3.6-3.6L14 8l5-4" />
      <path d="M19 4h-4" />
      <path d="M19 4v4" />
    </svg>
  );
}

export function TrendIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
      <path d="M16 7h6v6" />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 2.5s5.5 4.2 5.5 9.2a5.5 5.5 0 0 1-11 0c0-2 1-3.6 1-3.6s.6 1.5 1.8 2c0-3.5 2.7-5.6 2.7-7.6Z" />
      <path d="M12 21a3 3 0 0 0 3-3c0-1.7-3-3.7-3-3.7s-3 2-3 3.7a3 3 0 0 0 3 3Z" />
    </svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.7V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.7V17c0 .55.47.98.97 1.21 1.18.55 2 2.04 2 3.79" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.7l-1.6-4.5L6 9.6 10.4 8 12 3.5Z" />
      <path d="M18.5 15.5 19.2 17.6l2.1.8-2.1.8-.7 2.1-.7-2.1-2.1-.8 2.1-.8.7-2.1Z" />
      <path d="M5 14.5 5.5 16l1.5.5-1.5.5L5 18.5l-.5-1.5L3 16.5l1.5-.5L5 14.5Z" />
    </svg>
  );
}

export function ZapIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2a2.1 2.1 0 0 0-3-3Z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-4 12.9 12.9 0 0 1 8-6c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2Z" />
      <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0" />
      <path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
    </svg>
  );
}

export function SproutIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M7 20h10" />
      <path d="M12 20c0-6 2-9 7-10 0 6-2.5 9-7 10Z" />
      <path d="M12 20c0-5-1.7-8-6-9 0 5 2 8 6 9Z" />
      <path d="M12 20v-6" />
    </svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a6 6 0 0 0-4 10.5c.7.6 1 1.4 1 2.3v.2h6V14.8c0-.9.3-1.7 1-2.3A6 6 0 0 0 12 2Z" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect width="16" height="11" x="4" y="11" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.5 5.7a2 2 0 0 1-2 2L2 7" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" />
    </svg>
  );
}

/* ── Sylwetki i sprzęt ───────────────────────────────────────────────────── */

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.7 21.5a2 2 0 1 1-2.9-2.9l-1.7 1.8a2 2 0 1 1-2.9-2.8l6.4-6.4a2 2 0 1 1 2.9 2.8l-1.8 1.8a2 2 0 1 1 2.8 2.9Z" />
      <path d="m21.5 21.5-1.4-1.4" />
      <path d="m3.5 3.5 1.4 1.4" />
      <path d="m18 3 3 3" />
      <path d="m3 18 3-3" />
      <path d="m6.5 6.5 3.5 3.5" />
      <path d="m14 14 3.5 3.5" />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6.5V12" />
      <path d="m9 21 1.5-5.5L8 13" />
      <path d="m15 21-1.5-5.5L16 13" />
      <path d="M8 13H4l1.5-4" />
      <path d="M16 13h4l-1.5-4" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function HeartPulseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
      <path d="M3.2 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.3" />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function BikeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      <path d="M12 17.5 9.5 8h4l3 9.5" />
      <path d="M7 6h3" />
      <path d="m9.5 8 2.5 3.5h3.5" />
    </svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}

export function RopeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 4c4 2 6 5 6 8s-2 6-6 8" />
      <path d="M20 4c-4 2-6 5-6 8s2 6 6 8" />
      <path d="M8 8c2 1.5 3 3 3 4s-1 2.5-3 4" />
      <path d="M16 8c-2 1.5-3 3-3 4s1 2.5 3 4" />
    </svg>
  );
}

export function GamepadIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 12h4" />
      <path d="M8 10v4" />
      <circle cx="15" cy="11" r="1" />
      <circle cx="18" cy="13" r="1" />
      <path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.4 6.3a3 3 0 0 0 5.2 2.3L9 15.5h6l1.5 1.7a3 3 0 0 0 5.2-2.3l-.4-6.3A4 4 0 0 0 17.3 5Z" />
    </svg>
  );
}

/** Plecak — „wybrany sprzęt” w generatorze. */
export function BackpackIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 8a6 6 0 0 1 12 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

/* ── Ikony sekcji konta i szybkiego dostępu ──────────────────────────────── */

export function StarIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...svgProps(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85L12 3.5Z" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 1.72l-.12.9a2 2 0 0 1-1.18 1.52l-.27.12a2 2 0 0 1-1.9-.18l-.73-.53a2 2 0 0 0-2.61.4l-.22.38a2 2 0 0 0 .42 2.62l.6.5a2 2 0 0 1 .72 1.7v.3a2 2 0 0 1-.72 1.7l-.6.5a2 2 0 0 0-.42 2.62l.22.38a2 2 0 0 0 2.61.4l.73-.53a2 2 0 0 1 1.9-.18l.27.12a2 2 0 0 1 1.18 1.52l.12.9a2 2 0 0 0 2 1.72h.44a2 2 0 0 0 2-1.72l.12-.9a2 2 0 0 1 1.18-1.52l.27-.12a2 2 0 0 1 1.9.18l.73.53a2 2 0 0 0 2.61-.4l.22-.38a2 2 0 0 0-.42-2.62l-.6-.5a2 2 0 0 1-.72-1.7v-.3a2 2 0 0 1 .72-1.7l.6-.5a2 2 0 0 0 .42-2.62l-.22-.38a2 2 0 0 0-2.61-.4l-.73.53a2 2 0 0 1-1.9-.18l-.27-.12a2 2 0 0 1-1.18-1.52l-.12-.9a2 2 0 0 0-2-1.72Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function CircleHelpIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/** Trzy kropki — „Więcej" w mobilnym docku. */
export function MoreIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Sposób treningu (generator) ─────────────────────────────────────────── */

export function BicepsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9.5 6.5V5a2.5 2.5 0 0 1 5 0v1.5" />
      <path d="M12 6.5V11" />
      <path d="M14 6.5V10" />
      <path d="m9.5 11.5-2.2 2.1a4.5 4.5 0 0 0 6.4 0l2.3-2.1" />
      <path d="M12 11v5" />
      <path d="M14 10.5V16" />
      <path d="M16 11.5V16" />
    </svg>
  );
}

/** Partie ciała — jedna ikona na partię mięśni (zastępuje wcześniejsze emoji). */
export function ChestIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3v3" />
      <path d="M8 6h8" />
      <path d="M8.5 6v4a3.5 3.5 0 0 0 7 0V6" />
    </svg>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3v18" />
      <path d="M9 6h6" />
      <path d="M9.5 10h5" />
      <path d="M9.5 14h5" />
      <path d="M9.5 18h5" />
    </svg>
  );
}

export function LegsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 3v7l-2.5 11" />
      <path d="M15 3v7l2.5 11" />
      <path d="M9 10h6" />
    </svg>
  );
}

export function ShoulderIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="4" r="2" />
      <path d="M12 6.5V12" />
      <path d="M12 12 5 9" />
      <path d="M12 12l7-3" />
      <path d="m9 21 1.5-5.5L8 13" />
      <path d="m15 21-1.5-5.5L16 13" />
    </svg>
  );
}

export function ArmIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 14h6a4 4 0 0 0 4-4V6" />
      <circle cx="18" cy="6" r="2" />
    </svg>
  );
}

/**
 * Ikona partii mięśni — mapa nazwa → ikona.
 * Zastępuje wcześniejszą mapę emoji (`muscleGroupEmoji`).
 */
export function MuscleIcon({
  group,
  className = 'h-4 w-4',
}: {
  group: string;
  className?: string;
}) {
  switch (group) {
    case 'Klatka piersiowa': return <ChestIcon className={className} />;
    case 'Plecy': return <BackIcon className={className} />;
    case 'Nogi': return <LegsIcon className={className} />;
    case 'Barki': return <ShoulderIcon className={className} />;
    case 'Biceps': return <BicepsIcon className={className} />;
    case 'Triceps': return <ArmIcon className={className} />;
    case 'Brzuch': return <TargetIcon className={className} />;
    case 'Cardio': return <HeartPulseIcon className={className} />;
    case 'Ramiona': return <DumbbellIcon className={className} />;
    case 'Całe ciało': return <PersonIcon className={className} />;
    default: return <PersonIcon className={className} />;
  }
}

export function PullUpIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 6h18" />
      <path d="M6 6v3" />
      <path d="M18 6v3" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 14.5V19" />
      <path d="m9 22 3-3 3 3" />
    </svg>
  );
}

export function DipBarsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M6 9v6" />
      <path d="M18 9v6" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function SmithMachineIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 3v18" />
      <path d="M20 3v18" />
      <path d="M4 8h16" />
      <path d="M4 16h16" />
      <path d="M8 12h8" />
      <path d="M8 9.5v5" />
      <path d="M16 9.5v5" />
    </svg>
  );
}

export function LegPressIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 19h16" />
      <path d="M20 19V9" />
      <path d="M20 9 8 13" />
      <path d="m8 13-2-2.5" />
      <path d="M8 13v3" />
    </svg>
  );
}

export function RowingIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 17h18" />
      <path d="M6 17V9" />
      <path d="M6 9h12" />
      <path d="m18 9-4 4" />
      <circle cx="6" cy="6" r="2" />
    </svg>
  );
}

export function TreadmillIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 18h18" />
      <path d="M6 18 9 6" />
      <path d="M9 6h7" />
      <path d="M13 10h4" />
      <circle cx="15" cy="14" r="2" />
    </svg>
  );
}

/* ── Wskaźniki poziomu ───────────────────────────────────────────────────── */

export function DifficultyDot({
  level,
  className = 'h-2 w-2',
}: {
  /** 1 – początkujący, 2 – średni, 3 – zaawansowany */
  level: 1 | 2 | 3;
  className?: string;
}) {
  const color = level === 1 ? 'bg-emerald-500' : level === 2 ? 'bg-amber-500' : 'bg-red-500';
  return <span className={`inline-block rounded-full ${color} ${className}`} aria-hidden="true" />;
}

/** Wskaźnik „wykonane" — mały znaczek w kółku. */
export function DoneDot({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export type { React };
