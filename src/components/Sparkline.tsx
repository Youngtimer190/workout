/**
 * Mini-wykresy w kartach statystyk pulpitu.
 *
 * Dwa warianty:
 *  • `bars` — słupki (treningi / ćwiczenia / wolumen w kolejnych tygodniach),
 *  • `line` — linia (seria dni z rzędu).
 *
 * To grafika OZDOBNA — informację niosą liczba i delta obok. Dlatego wykres
 * jest ukryty dla czytników ekranu (`aria-hidden`), a same dane są w propsach.
 *
 * Gdy danych brak (albo są same zera), rysujemy płaski wykres z kropkami —
 * ma wyglądać neutralnie, a nie „zepsuto".
 *
 * Szerokość:
 *  • słupki — płynna (wypełniają szerokość kontenera), więc na telefonie
 *    rozciągają się pod deltą, a na desktopie zajmują wąski pas,
 *  • linia — stała (SVG z viewBox i `non-scaling-stroke`).
 */

interface SparklineProps {
  /** Wartości (od najstarszej do najnowszej). */
  data: number[];
  type?: 'bars' | 'line';
  /** Szerokość viewBox (tylko dla linii). */
  width?: number;
  /** Wysokość w px. */
  height?: number;
  className?: string;
}

export default function Sparkline({
  data,
  type = 'bars',
  width = 72,
  height = 26,
  className = '',
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  if (type === 'line') {
    return <LineSpark data={data} width={width} height={height} className={className} />;
  }
  return <BarSpark data={data} height={height} className={className} />;
}

/* ── Słupki ─────────────────────────────────────────────────────────────── */

function BarSpark({
  data,
  height,
  className,
}: {
  data: number[];
  height: number;
  className: string;
}) {
  const max = Math.max(...data, 0);
  const pusty = max <= 0;

  return (
    <div
      className={`flex w-full items-end justify-center gap-[2px] ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      {data.map((value, i) => {
        const ostatni = i === data.length - 1;
        const wysokosc = pusty ? 12 : Math.max(12, Math.round((value / max) * 100));
        return (
          <span
            key={i}
            className={`min-w-[2px] flex-1 rounded-full ${
              pusty ? 'bg-white/10' : ostatni ? 'bg-cyan-300' : 'bg-cyan-400/70'
            }`}
            style={{ height: `${wysokosc}%`, maxWidth: '6px' }}
          />
        );
      })}
    </div>
  );
}

/* ── Linia ──────────────────────────────────────────────────────────────── */

function LineSpark({
  data,
  width,
  height,
  className,
}: {
  data: number[];
  width: number;
  height: number;
  className: string;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const rozpietosc = Math.max(1, max - min);
  const id = `spark-line-${data.length}-${Math.round(max)}`;

  const points = data.map((value, i) => {
    const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
    const y = height - ((value - min) / rozpietosc) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linia = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const obszar = `${linia} L${width} ${height} L0 ${height} Z`;
  const [ostatniX, ostatniY] = points[points.length - 1];

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={obszar} fill={`url(#${id})`} />
      <path
        d={linia}
        stroke="#22d3ee"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ostatniX} cy={ostatniY} r="2.4" fill="#67e8f9" />
    </svg>
  );
}
