import { ReactNode } from 'react';
import { formatDelta, DeltaView } from '../lib/format';
import Sparkline from './Sparkline';
import { TrendDownIcon, TrendUpIcon } from './icons';

/**
 * Karta statystyki w górnej sekcji pulpitu.
 *
 * Układ (z referencji):
 *   [ikona] Etykieta
 *   WARTOŚĆ
 *   podpis
 *   delta              [mini-wykres]
 *
 * Delta to porównanie z poprzednim okresem („+4 vs poprzedni tydzień”).
 * Strzałka jest ICONĄ SVG — nie znakiem `↑` i nie emoji.
 */

const DELTA_STYL: Record<DeltaView['kierunek'], string> = {
  up: 'text-emerald-300',
  down: 'text-amber-300',
  flat: 'text-slate-400',
  brak: 'text-slate-500',
};

interface StatCardProps {
  /** Ikona w nagłówku karty. */
  icon: ReactNode;
  /** Nazwa metryki. */
  label: string;
  /** Wartość główna. */
  value: ReactNode;
  /** Jednostka przy wartości („kg", „dni"). */
  suffix?: string;
  /** Podpis pod wartością. */
  sub?: string;
  /** Porównanie z poprzednim okresem. */
  delta?: import('../lib/format').DeltaInput;
  /** Dane do mini-wykresu. */
  series?: number[];
  /** Wariant mini-wykresu. */
  seriesType?: 'bars' | 'line';
  /** Czy karta ma być wyróżniona (obwódka + poświata). */
  highlighted?: boolean;
}

export default function StatCard({
  icon,
  label,
  value,
  suffix,
  sub,
  delta,
  series,
  seriesType = 'bars',
  highlighted = false,
}: StatCardProps) {
  const deltaView = delta ? formatDelta(delta) : null;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border p-3.5 transition-colors sm:p-4 ${
        highlighted
          ? 'border-cyan-400/50 bg-gradient-to-br from-cyan-500/[0.12] to-transparent shadow-[0_18px_45px_-22px_rgba(34,211,238,0.85)]'
          : 'border-cyan-400/15 bg-white hover:border-cyan-400/30'
      }`}
    >
      {/* ── Nagłówek: ikona + etykieta ── */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${
            highlighted
              ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
              : 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300'
          }`}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold leading-tight text-slate-300 sm:text-xs">
          {label}
        </span>
      </div>

      {/* ── Wartość ── */}
      <p className="mt-2.5 flex items-baseline gap-1">
        <span className="text-2xl font-extrabold leading-none tracking-tight text-white sm:text-[28px]">
          {value}
        </span>
        {suffix && (
          <span className="text-xs font-semibold text-slate-400 sm:text-sm">{suffix}</span>
        )}
      </p>

      {/* ── Podpis ── */}
      <p className="mt-1 h-4 truncate text-[11px] leading-tight text-slate-500">{sub ?? ''}</p>

      {/* ── Delta + mini-wykres ──
          Na telefonie wykres schodzi POD deltę (delta + wykres nie mieszczą
          się w wąskiej karcie), od `lg` wraca obok niej. */}
      <div className="mt-auto flex flex-col gap-2 pt-2.5 lg:flex-row lg:items-end lg:justify-between lg:gap-1">
        {deltaView && (
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold leading-tight ${DELTA_STYL[deltaView.kierunek]}`}
          >
            {deltaView.kierunek === 'up' && (
              <TrendUpIcon className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            {deltaView.kierunek === 'down' && (
              <TrendDownIcon className="h-3.5 w-3.5 flex-shrink-0" />
            )}
            <span className="whitespace-nowrap leading-tight">{deltaView.tekst}</span>
          </span>
        )}
        {series && series.length > 0 && (
          <Sparkline
            data={series}
            type={seriesType}
            className={
              seriesType === 'bars' ? 'w-full lg:ml-auto lg:w-[48px]' : 'w-[48px] lg:ml-auto'
            }
          />
        )}
      </div>
    </div>
  );
}
