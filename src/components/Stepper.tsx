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
  /**
   * Czy otwarte pole ma od razu dostać fokus (i otworzyć klawiaturę).
   *
   * Na telefonie NIE chcemy tego: klawiatura zasłania tracker, a użytkownik
   * często chce tylko pokliknąć „+”. Tam pole dostanie fokus dopiero po
   * dotknięciu.
   */
  autoFocusInput?: boolean;
  onBeginEdit: () => void;
  onEditingChange: (editing: boolean) => void;
}

/**
 * Maksymalny czas powtarzania kroku przy przytrzymaniu przycisku.
 *
 * Bez tego limitu zdarza się, że przeglądarka (zdarza się to na iOS
 * Safari) nie dostarczy zdarzenia „pointerup" i wartość rośnie
 * w nieskończoność. Limit jest twardy — po jego upływie powtarzanie
 * się zatrzymuje, a przycisk trzeba puścić i nacisnąć ponownie.
 */
const MAX_REPEAT_MS = 4_000;

/**
 * Ile musi trwać naciśnięcie, żeby zacząć powtarzać krok.
 *
 * Celowo wysoki próg: pierwsze dotknięcie po otwarciu edytora bywa
 * przypadkowo dłuższe (użytkownik celuje w przycisk, który dopiero
 * się pojawił) i nie może skończyć się skokiem o kilkadziesiąt.
 */
const LONG_PRESS_MS = 900;

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
  autoFocusInput = true,
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
  /** Punkt, w którym palec nacisnął przycisk (do anulowania przy ruchu). */
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const longPress = useRef(false);
  /**
   * Kiedy ostatnio zastosowaliśmy krok przyciskiem.
   *
   * Po kliknięciu (lub przytrzymaniu) przeglądarka wysyła jeszcze event
   * „click”. Gdyby zaliczyć go jako kolejny krok, jedno dotknięcie dawałoby
   * +2. Dlatego klik krótko po obsłużonym dotknięciu ignorujemy — a sam
   * „click” obsługujemy tylko wtedy, gdy nie było dotknięcia (klawiatura).
   */
  const lastPointerStepAt = useRef(0);
  /**
   * Czy właśnie wciśnięto przycisk ±.
   *
   * Ważne na telefonie: naciśnięcie „+" przenosi fokus z pola na przycisk,
   * a pole traci fokus (blur) → bez tej flagi edytor by się zamykał
   * i „stepper znikał" po pierwszym kliknięciu.
   */
  const stepping = useRef(false);

  // Pole wejściowe dostaje fokus przy otwarciu (bez tego klawiatura
  // mobilna nie otwiera się sama). Na telefonie pomijamy to — klawiatura
  // zasłaniałaby tracker, a użytkownik często chce tylko użyć „+”.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (editing && autoFocusInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editing, autoFocusInput]);

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

  // Schowanie karty (np. przełączanie aplikacji) musi zatrzymać powtarzanie —
  // inaczej w tle wartość rosłaby w nieskończoność.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        clearTimers();
        longPress.current = true;
        stepping.current = false;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [clearTimers]);

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
    // Krok ± nie może zamknąć edytora (na telefonie kliknięcie przycisku
    // zabiera fokus z pola → blur → zamknięcie → „stepper znika”).
    if (!stepping.current) onEditingChange(false);
  }, [draft, clamp, onChange, onEditingChange]);

  /* ── Przytrzymanie przycisku ± ────────────────────────────────────────── */
  /**
   * Powtarzanie kroku: co 200 ms pojedynczy krok, po 1,5 s przyspieszenie
   * do ×5 co 300 ms. Dzięki temu przytrzymanie „+" daje szybki przyrost
   * (np. 20 → 60 powtórzeń), ale nie ucieka do setek.
   */
  const scheduleRepeat = useCallback((direction: 1 | -1) => {
    const elapsed = Date.now() - pressStartedAt.current;
    // Twardy limit: przytrzymanie nie może trwać w nieskończoność
    // (zdarza się, że przeglądarka nie dostarczy zdarzenia „pointerup").
    if (elapsed > MAX_REPEAT_MS) {
      longPress.current = true; // kończymy bez dodatkowego kroku
      return;
    }
    const fast = elapsed > 1500;
    repeatTimer.current = window.setTimeout(() => {
      applyStep(direction, fast ? 5 : 1);
      scheduleRepeat(direction);
    }, fast ? 400 : 200);
  }, [applyStep]);

  const startPress = (direction: 1 | -1, event?: React.PointerEvent<HTMLButtonElement>) => {
    clearTimers();
    longPress.current = false;
    stepping.current = true;
    pressStartedAt.current = Date.now();

    // Przechwytujemy wskaźnik: dzięki temu zdarzenia „pointerup”
    // zawsze trafią do przycisku, nawet jeśli palec zejdzie z niego
    // (bez tego powtarzanie mogłoby działać w nieskończoność).
    try { event?.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* nieobsługiwane */ }
    pressStart.current = event ? { x: event.clientX, y: event.clientY } : null;

    // Próg jest wysoki (900 ms), bo pierwsze dotknięcie bywa
    // przypadkowo dłuższe — użytkownik celuje w dopiero co pokazany
    // przycisk. Krótkie dotknięcie ZAWSZE daje dokładnie jeden krok.
    pressTimer.current = window.setTimeout(() => {
      longPress.current = true;
      applyStep(direction);
      scheduleRepeat(direction);
    }, LONG_PRESS_MS);
  };

  /**
   * Zakończenie naciśnięcia.
   *
   * Krok zastosujemy TUTAJ (przy "pointerup"), a nie w "click" — na iOS
   * Safari preventDefault() w "pointerdown" potrafi zablokować event
   * "click", przez co kliknięcie nic by nie robiło.
   */
  const endPress = (direction: 1 | -1, event?: React.PointerEvent<HTMLButtonElement>) => {
    const wasLong = longPress.current;
    clearTimers();
    try { event?.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* nieobsługiwane */ }
    if (!wasLong) {
      applyStep(direction);
      lastPointerStepAt.current = Date.now();
    }
    // Flaga „krokujemy” trzymamy jeszcze chwilę — blur pola bywa
    // opóźniony o jedno zdarzenie.
    window.setTimeout(() => { stepping.current = false; }, 300);
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

  // Rozmiary celów dotykowych:
  // • „expanded" (pasek na telefonie/tablecie) — 40 px, cel dla kciuka,
  // • „inline" (desktop) — 32 px, wygodne dla myszy.
  // Wcześniej było 20/28 px — za mało, palec trafiał obok.
  const btnSize = mode === 'expanded' ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = mode === 'expanded' ? 'h-5 w-5' : 'h-4 w-4';

  const stepButton = (direction: 1 | -1, ariaLabel: string) => (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onPointerDown={e => {
        // Blokujemy domyślne zachowanie (przeniesienie fokusu, menu
        // kontekstowe) — na iOS inaczej przycisk „zjada" kliknięcia.
        e.preventDefault();
        startPress(direction, e);
      }}
      onPointerUp={e => {
        e.preventDefault();
        endPress(direction, e);
      }}
      onPointerMove={e => {
        // Palec się przesunął → użytkownik przewija listę, nie chce
        // zwiększać wartości. Anulujemy powtarzanie.
        const start = pressStart.current;
        if (!start) return;
        if (Math.abs(e.clientX - start.x) > 10 || Math.abs(e.clientY - start.y) > 10) {
          clearTimers();
          longPress.current = true; // traktujemy jak „przerwane”
        }
      }}
      onPointerCancel={() => {
        clearTimers();
        stepping.current = false;
      }}
      onLostPointerCapture={() => {
        clearTimers();
        stepping.current = false;
      }}
      onContextMenu={e => e.preventDefault()}
      onMouseDown={e => e.preventDefault()}
      onClick={() => {
        // Klawiatura (Enter/Space) wysyła „click” bez pointerdown/pointerup —
        // wtedy krok jeszcze nie został zastosowany i musimy go dorzucić.
        // Przy dotknięciu krok zastosowaliśmy już w „pointerup”, więc
        // klik krótko po nim ignorujemy (inaczej jedno dotknięcie dawałoby +2).
        if (Date.now() - lastPointerStepAt.current > 300) applyStep(direction);
      }}
      style={{
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      className={`${btnSize} flex-shrink-0 rounded-xl border flex items-center justify-center transition-all active:scale-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        direction === 1
          ? 'border-violet-400/50 bg-violet-600 text-white shadow-sm shadow-violet-500/30 hover:bg-violet-500'
          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
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
      className={`text-center rounded-lg border-2 bg-white focus:outline-none text-slate-800 ${
        mode === 'expanded'
          ? 'min-w-0 flex-1 h-10 text-base font-bold px-2'
          : 'w-20 h-8 text-xs font-bold px-1'
      } ${
        tone === 'amber' ? 'border-amber-400' : 'border-violet-400'
      }`}
    />
  ) : (
    <button
      type="button"
      onClick={() => onBeginEdit()}
      className={`text-center font-bold rounded-lg border-2 transition-all cursor-pointer active:scale-95 ${
        mode === 'expanded'
          ? 'min-w-0 flex-1 h-10 text-base px-2'
          : 'w-20 h-8 text-xs px-1'
      } ${toneClasses}`}
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
