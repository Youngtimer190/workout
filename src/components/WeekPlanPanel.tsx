import { useMemo } from 'react';
import { WorkoutDay } from '../types';
import {
  DayStatus,
  DaySummary,
  projectWeekShadow,
  summarizeWeek,
} from '../lib/stats';
import { CalendarPlanIcon, CheckIcon, MoonIcon, TimerIcon } from './icons';

/**
 * Sekcja „Plan tygodnia" na pulpicie.
 *
 * Pokazuje tydzień jako **rozliczenie**, a nie jako plan: przy każdym dniu
 * widzimy, ile ćwiczeń zostało zrobione, jak wygląda postęp w obrębie
 * dnia i czy dzień się liczy. Na dole — podsumowanie tygodnia i „cień
 * tygodniowy" (prognoza przy obecnym tempie).
 *
 * JEDNA METRYKA
 * ─────────────
 * Sekcja liczy **ćwiczenia**. Przełącznik „Ćwiczenia | Treningi" został
 * usunięty, bo:
 *  • liczba dni treningowych jest już raportowana na tym samym ekranie
 *    (kafelek „Dni treningowe" i dopisek „w tym tygodniu X z Y dni"),
 *  • w trybie „Treningi" karty pokazywały serie, a stopka dni — dwie różne
 *    jednostki w jednym widoku,
 *  • na telefonie (gdzie jednostka pod liczbą nie mieściła się) liczby były
 *    zupełnie niesamoznaczne.
 *
 * Jednostka jest widoczna ZAWSZE (także na telefonie) — liczba bez etykiety
 * to nieporozumienie.
 *
 * RESPONSYWNOŚĆ
 * ─────────────
 *  • < 640 px — siedem wąskich kolumn: skrót dnia, liczba, jednostka i
 *    mini-wykres. Data i chip statusu nie mieściłyby się — stan dnia
 *    komunikują wtedy kolor liczby i mini-wykres.
 *  • ≥ 640 px — pełne karty: skrót, data, liczba, jednostka, wykres, chip.
 */

/** Skróty dni (standardowa polska skrótka, jak w designie). */
const SKROT_DNI = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
const DOMYSLNE_NAZWY = [
  'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela',
];

interface WeekPlanPanelProps {
  /** Dni tygodnia (zawsze 7). */
  days: WorkoutDay[];
  /** Klucz tygodnia (tylko do wyliczenia dat). */
  weekKey?: string | null;
  /** Indeks dzisiejszego dnia (0 = poniedziałek). */
  todayIndex: number;
  /** Przejście do planera na wybrany dzień. */
  onGoToDay?: (dayIndex: number) => void;
}

/**
 * Skrót nazwy dnia.
 *
 * Domyślne nazwy tygodnia dostają standardową polską skrótkę („Pon", „Czw"),
 * a własne nazwy użytkownika — trzy pierwsze litery.
 */
function dayAbbr(name: string, index: number): string {
  const domyslna = DOMYSLNE_NAZWY[index];
  if (!domyslna) return name.slice(0, 3);
  if (name.trim().toLocaleLowerCase('pl-PL') === domyslna.toLocaleLowerCase('pl-PL')) {
    return SKROT_DNI[index];
  }
  return name.slice(0, 3);
}

/** Data w formacie „16.11". */
function formatDayDate(date: Date | null): string {
  if (!date) return '';
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Wygląd „chipa" statusu dnia. */
const STATUS: Record<DayStatus, { tekst: string; klasa: string }> = {
  done: {
    tekst: 'Zrealizowano',
    klasa: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-300',
  },
  partial: {
    tekst: 'W trakcie',
    klasa: 'border-cyan-400/25 bg-cyan-500/15 text-cyan-300',
  },
  none: {
    tekst: 'Brak aktywności',
    klasa: 'border-white/10 bg-white/[0.05] text-slate-400',
  },
  rest: {
    tekst: 'Odpoczynek',
    klasa: 'border-white/10 bg-white/[0.05] text-slate-400',
  },
};

export default function WeekPlanPanel({
  days,
  weekKey,
  todayIndex,
  onGoToDay,
}: WeekPlanPanelProps) {
  const podsumowanie = useMemo(
    () => summarizeWeek(days, todayIndex, weekKey),
    [days, todayIndex, weekKey]
  );

  /**
   * Liczba dni, które już minęły w tym tygodniu.
   *
   * Poniedziałek to 1 dzień, niedziela to 7. Po niedzieli tygodnia nie ma
   * już czego prognozować.
   */
  const mineloDni = Math.min(7, Math.max(1, todayIndex + 1));
  const cien = projectWeekShadow(
    podsumowanie.doneExercises,
    mineloDni,
    podsumowanie.plannedExercises
  );

  const procent =
    podsumowanie.plannedExercises > 0
      ? Math.round((podsumowanie.doneExercises / podsumowanie.plannedExercises) * 100)
      : 0;

  return (
    <section className="rounded-2xl border border-cyan-400/15 bg-white p-4 sm:p-5">
      {/* ── Nagłówek ── */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
          <CalendarPlanIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-white">Plan tygodnia</h2>
          <p className="mt-0.5 text-[11px] leading-tight text-slate-400 sm:text-xs">
            Twoja aktywność w tym tygodniu
          </p>
        </div>
      </div>

      {/* ── Siedem dni ── */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {podsumowanie.days.map(d => (
          <DayTile
            key={d.dayIndex}
            day={d}
            onClick={onGoToDay ? () => onGoToDay(d.dayIndex) : undefined}
          />
        ))}
      </div>

      {/* ── Podsumowanie tygodnia ──
          Na telefonie układ jest trzywierszowy (opis + procent / pasek /
          cień tygodniowy); od 640 px jeden wiersz. Kolejność wizualna na
          desktopie daje `order-*` — na telefonie elementy leżą w swoich
          wierszach, więc kolejność nie ma znaczenia. */}
      <div
        aria-live="polite"
        className="mt-4 flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex items-baseline justify-between gap-3 sm:contents">
          <span className="order-1 whitespace-nowrap text-xs font-semibold text-white sm:text-sm">
            {podsumowanie.doneExercises} / {podsumowanie.plannedExercises} wykonanych ćwiczeń
          </span>
          <span className="order-3 whitespace-nowrap text-xs font-bold text-slate-200 sm:text-sm">
            {procent}%
          </span>
        </div>
        <div className="order-2 h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-white/10 sm:w-auto sm:flex-1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-[width] duration-700"
            style={{ width: `${procent}%` }}
          />
        </div>
        <span
          className="order-4 flex items-center gap-1.5 whitespace-nowrap text-[11px] text-slate-400 sm:text-xs"
          title={
            cien === null
              ? 'Prognoza nie ma jeszcze sensu'
              : 'Ile ćwiczeń wykonasz w tym tygodniu przy obecnym tempie'
          }
        >
          <TimerIcon className="h-4 w-4 flex-shrink-0 text-cyan-300" />
          Cień tygodniowy:{' '}
          <span className="font-semibold text-slate-200">
            {cien === null ? '—' : `${cien} ćw.`}
          </span>
        </span>
      </div>
    </section>
  );
}

/* ── Karta jednego dnia ──────────────────────────────────────────────────── */

function DayTile({
  day,
  onClick,
}: {
  day: DaySummary;
  onClick?: () => void;
}) {
  const status = STATUS[day.status];

  const skrot = dayAbbr(day.name, day.dayIndex);
  const data = formatDayDate(day.date);

  const opis = day.isRestDay
    ? `${day.name}: odpoczynek`
    : day.planned === 0
    ? `${day.name}: brak zaplanowanych ćwiczeń`
    : `${day.name}: ${day.done} z ${day.planned} ćwiczeń ukończonych`;

  const tresc = (
    <>
      <span className="text-[10px] font-bold leading-none text-slate-300 sm:text-xs">
        {skrot}
      </span>

      {/* Data — na wąskich ekranach zostaje sam skrót dnia */}
      <span className="h-[11px] text-[9px] leading-none sm:h-[12px] sm:text-[10px]">
        {day.isToday ? (
          <span className="font-semibold text-cyan-300">Dziś</span>
        ) : (
          <span className="hidden text-slate-500 sm:inline">{data}</span>
        )}
      </span>

      <span
        className={`text-lg font-extrabold leading-none tracking-tight sm:text-2xl ${
          day.status === 'done'
            ? 'text-emerald-300'
            : day.status === 'partial'
            ? 'text-cyan-300'
            : day.planned === 0
            ? 'text-slate-600'
            : 'text-slate-400'
        }`}
      >
        {day.planned === 0 ? '–' : day.done}
      </span>

      {/* Jednostka — widoczna ZAWSZE, także na telefonie. Bez niej liczba
          jest nieczytelna. */}
      <span className="text-[9px] leading-none text-slate-500">
        {day.planned === 0 ? '' : 'ćwiczeń'}
      </span>

      {/* Mini-wykres — jeden słupek na zaplanowane ćwiczenie */}
      {day.exercises.length > 0 && (
        <div
          className="mt-0.5 flex h-5 w-full items-end justify-center gap-[2px] sm:h-8 sm:gap-[3px]"
          aria-hidden="true"
        >
          {day.exercises.slice(0, 8).map((e, i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full sm:w-1.5 ${
                e.done ? 'bg-cyan-400' : 'bg-white/15'
              }`}
              style={{
                height: `${Math.round(
                  (e.done ? 1 : e.progress > 0 ? Math.max(0.3, e.progress) : 0.22) * 100
                )}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Chip statusu */}
      <span
        className={`mt-1 hidden w-full truncate rounded-full border px-1.5 py-0.5 text-center text-[9px] font-semibold leading-tight sm:block ${status.klasa}`}
      >
        {day.isRestDay && (
          <MoonIcon className="mr-0.5 inline-block h-2.5 w-2.5 align-[-1px]" />
        )}
        {day.status === 'done' && (
          <CheckIcon className="mr-0.5 inline-block h-2.5 w-2.5 align-[-1px]" />
        )}
        {status.tekst}
      </span>
    </>
  );

  const klasaKarty = `flex flex-col items-center gap-1 rounded-xl border px-0.5 py-2 transition-colors sm:gap-1.5 sm:px-1 ${
    day.isToday
      ? 'border-cyan-400/60 bg-cyan-500/[0.07]'
      : 'border-white/[0.06] bg-white/[0.02]'
  }`;

  if (!onClick) {
    return <div className={klasaKarty}>{tresc}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={opis}
      className={`${klasaKarty} cursor-pointer hover:border-cyan-400/30 hover:bg-white/[0.05]`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {tresc}
    </button>
  );
}
