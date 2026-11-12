import { useCallback, useEffect, useRef, useState } from 'react';

/** Kolor akcentu steppera — odpowiada kolorowi kolumny (powt. / kg). */
export type StepperTone = 'violet' | 'amber';

/**
 * Tryb wyświetlania:
 * • `inline`   — przyciski ± zawsze widoczne obok wartości (tablet/desktop),
 * • `compact`  — sama wartość (telefon, dopóki nie dotknięto),
 * • `expanded` — [−][wartość][+] z dużymi przyciskami (telefon, w trakcie edycji).
 */
export type StepperMode = 'inline' | 'compact' | 'expanded';

interface StepperProps {
  /** Aktualna wartość (null = nie zapisano). */
  value: number | null;
  /** Zapis nowej wartości (null = wyczyść). */
  onChange: (value: number | null) => void;
  /** Krok jednego kliknięcia ±. */
  step?: number;
  min?: number;
  max?: number;
  /** Ilość miejsc po przecinku (powtórzenia 0, ciężar 1). */
  precision?: number;
  tone?: StepperTone;
  mode?: StepperMode;
  /** Nazwa pola — dla czytników ekranu („Zwiększ powtórzenia”). */
  label: string;
  /** Prefiks przy wartości, np. „2×” dla hantli. */
  prefix?: string;

  /* ── Tryb edycji (kontrolowany z zewnątrz) ────────────────────────────── */
  editing: boolean;
  /** Czy seria jest zaliczona — zmienia kolor wartości. */
  done?: boolean;
  onBeginEdit: () => void;
  onEditingChange: (editing: boolean) => void;
}

/** Zaokrąglenie do zadanej liczby miejsc po przecinku (bez błędów float). */
export function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Czysta logika jednego kroku steppera.
 *
 * • pusta wartość: `+` daje 1 (od zera), `−` nie robi nic (null zostaje null),
 * • wartość jest ograniczona do `min`–`max`,
 * • `multiplier` pozwala przyspieszyć (przytrzymanie przycisku),
 * • zaokrąglenie do `precision` miejsc (ciężar: 0,5 kg).
 */
export function stepValue(
  current: number | null,
  direction: 1 | -1,
  step: number,
  options: { min?: number; max?: number; precision?: number; multiplier?: number } = {}
): number | null {
  const { min = 0, max = 999, precision = 0, multiplier = 1 } = options;

  const base = current ?? (direction > 0 ? 0 : null);
  if (base === null) return null;

  const raw = base + direction * step * multiplier;
  const clamped = Math.min(max, Math.max(min, raw));
  return roundTo(clamped, precision);
}

/**
 * Stepper wartości liczbowej: przyciski `−` i `+` obok pola.
 *
 * Zasady:
 *  • krok `+`/`−` działa natychmiast (bez klawiatury),
 *  • przytrzymanie przycisku (600 ms) powtarza krok, po 1,5 s przyspiesza do ×5,
 *  • pole nadal można edytować ręcznie (dla wartości typu 62,5 kg),
 *  • pusta wartość: `+` daje 1, `−` nic nie robi (nie zostawia „0 powtórzeń”),
 *  • nic nie zmienia statusu serii — zaznacza ją nadal checkbox.
 */
export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  precision = 0,
  tone = 'violet',
  mode = 'inline',
  label,
  prefix,
  editing,
  done = false,
  onBeginEdit,
  onEditingChange,
}: StepperProps) {
  const [draft, setDraft] = useState('');

  // Aktualna wartość w REF — przytrzymanie przycisku liczy od bieżącej
  // wartości, a nie od tej z chwili rozpoczęcia (inaczej kolejne powtórzenia
  // nadpisywałyby siebie i wartość stałaby w miejscu).
  const valueRef = useRef<number | null>(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Timery przytrzymania przycisku
  const pressTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);
  const pressStartedAt = useRef(0);
  const longPress = useRef(false);

  // Pole wejściowe dostaje fokus przy otwarciu (bez tego klawiatura
  // mobilna nie otwiera się sama).
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing]);

  const clearTimers = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    if (repeatTimer.current !== null) {
      window.clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Wartość w polu podczas edycji
  useEffect(() => {
    if (editing) setDraft(value != null ? String(value) : '');
  }, [editing, value]);

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, roundTo(v, precision))),
    [min, max, precision]
  );

  /** Zmiana wartości o `direction × step × multiplier`. */
  const applyStep = useCallback(
    (direction: 1 | -1, multiplier = 1) => {
      const next = stepValue(valueRef.current, direction, step, {
        min, max, precision, multiplier,
      });
      if (next === null) return; // pusta wartość — „−" nie robi nic
      valueRef.current = next;
      onChange(next);
      if (editing) setDraft(String(next));
    },
    [step, min, max, precision, onChange, editing]
  );

  const commit = useCallback(() => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      onChange(null);
    } else {
      onChange(clamp(parsed));
    }
    onEditingChange(false);
  }, [draft, clamp, onChange, onEditingChange]);

  /* ── Przytrzymanie przycisku ± ────────────────────────────────────────── */
  /**
   * Powtarzanie kroku: co 200 ms pojedynczy krok, po 1,5 s przyspieszenie
   * do ×5 co 300 ms. Dzięki temu przytrzymanie „+" daje szybki przyrost
   * (np. 20 → 60 powtórzeń), ale nie ucieka do setek.
   */
  const scheduleRepeat = useCallback((direction: 1 | -1) => {
    const fast = Date.now() - pressStartedAt.current > 1500;
    repeatTimer.current = window.setTimeout(() => {
      applyStep(direction, fast ? 5 : 1);
      scheduleRepeat(direction);
    }, fast ? 300 : 200);
  }, [applyStep]);

  const startPress = (direction: 1 | -1) => {
    clearTimers();
    longPress.current = false;
    pressStartedAt.current = Date.now();
    pressTimer.current = window.setTimeout(() => {
      longPress.current = true;
      applyStep(direction);
      scheduleRepeat(direction);
    }, 600);
  };

  const endPress = () => {
    clearTimers();
  };

  /* ── Wygląd ───────────────────────────────────────────────────────────── */
  const toneClasses = (() => {
    if (value == null) {
      return 'border-dashed border-slate-200 bg-transparent text-slate-300';
    }
    if (done) {
      return 'border-emerald-200 bg-emerald-100 text-emerald-800';
    }
    return tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-violet-200 bg-violet-50 text-violet-800';
  })();

  const btnSize = mode === 'expanded' ? 'w-7 h-7' : 'w-5 h-5';
  const iconSize = mode === 'expanded' ? 'h-4 w-4' : 'h-3 w-3';

  const stepButton = (direction: 1 | -1, ariaLabel: string) => (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onPointerDown={e => {
        e.preventDefault();
        startPress(direction);
      }}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={e => e.preventDefault()}
      onClick={() => {
        // Po przytrzymaniu klik nie może dodać jeszcze jednego kroku.
        if (longPress.current) { longPress.current = false; return; }
        applyStep(direction);
      }}
      style={{ touchAction: 'manipulation', userSelect: 'none' }}
      className={`${btnSize} flex-shrink-0 rounded-md border border-slate-100 bg-slate-100 text-slate-500 flex items-center justify-center transition-colors active:scale-90 cursor-pointer hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed`}
      disabled={value === null && direction === -1}
    >
      {direction === 1 ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className={iconSize}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" className={iconSize}>
          <path d="M5 12h14" />
        </svg>
      )}
    </button>
  );

  const valueControl = editing ? (
    <input
      ref={inputRef}
      autoFocus
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={draft}
      aria-label={label}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onEditingChange(false); }
      }}
      className={`min-w-0 flex-1 text-center text-xs font-bold px-1 py-2.5 rounded-lg border-2 bg-white focus:outline-none text-slate-800 ${
        tone === 'amber' ? 'border-amber-400' : 'border-violet-400'
      }`}
    />
  ) : (
    <button
      type="button"
      onClick={() => onBeginEdit()}
      className={`min-w-0 flex-1 text-center text-xs font-bold py-2.5 px-1 rounded-lg border-2 transition-all cursor-pointer active:scale-95 ${toneClasses}`}
    >
      {value != null ? (
        <>
          {prefix && <span className="text-[9px] font-bold text-slate-400 mr-0.5">{prefix}</span>}
          {value}
        </>
      ) : '—'}
    </button>
  );

  if (mode === 'compact') {
    return <div className="flex w-full justify-center">{valueControl}</div>;
  }

  return (
    <div className={`flex items-center justify-center ${mode === 'expanded' ? 'gap-1.5' : 'gap-1'} ${mode === 'expanded' ? '' : 'max-w-[170px] mx-auto'}`}>
      {stepButton(-1, `Zmniejsz ${label.toLowerCase()}`)}
      {valueControl}
      {stepButton(1, `Zwiększ ${label.toLowerCase()}`)}
    </div>
  );
}
