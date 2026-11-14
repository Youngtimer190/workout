import { useSyncExternalStore } from 'react';
import { clampDuration, DEFAULT_REST_MS } from '../lib/restTimer';
import {
  acquireWakeLock,
  cancelPendingBell,
  playBell,
  prepareBell,
  releaseWakeLock,
  vibrateDone,
  vibrateTick,
} from '../lib/restAudio';
import { cancelRestTimerPush, scheduleRestTimerPush } from '../lib/pushClient';

/**
 * Globalny stan timera odpoczynku.
 *
 * Timer jest jednym dla całej aplikacji (nie dla ćwiczenia) — zmiana
 * widoku, wejście w Planera czy przewinięcie nie mogą go zatrzymać.
 *
 * Dlatego trzymamy go w module (singleton), a nie w komponencie:
 * nie trzeba przekazywać stanu przez cztery poziomy drzewa
 * (App → WorkoutPlanner → DayColumn → ExerciseCard → SetTracker),
 * a stan przetrwa zmianę widoku.
 *
 * Źródłem prawdy jest **znacznik czasu końca** (`endsAt`), nigdy licznik,
 * który się odlicza — patrz `src/lib/restTimer.ts`.
 */

export interface RestTimerSettings {
  /** Domyślny czas przerwy po zaznaczeniu serii. */
  defaultDurationMs: number;
  /** Czy zaznaczenie serii startuje przerwę automatycznie. */
  autoStart: boolean;
  /** Czy na koniec przerwy gra dźwięk. */
  soundEnabled: boolean;
  /** Czy na koniec przerwy są wibracje (Android; iOS ich nie obsługuje). */
  vibrationEnabled: boolean;
  /** Czy ekran ma pozostać włączony w trakcie przerwy. */
  keepScreenOn: boolean;
  /** Czy wysyłać powiadomienie systemowe (push) na koniec przerwy. */
  pushEnabled: boolean;
}

export interface RestTimerState {
  /** Znacznik czasu końca przerwy (ms) — `null`, gdy timer nie działa. */
  endsAt: number | null;
  /** Kiedy przerwa się zaczęła — do rysowania pierścienia postępu. */
  startedAt: number | null;
  /** Całkowity czas przerwy (ms) — pierścień postępu. */
  durationMs: number;
  /** Czy przerwa jest wstrzymana. */
  paused: boolean;
  /** Pozostały czas w momencie wstrzymania (ms). */
  pausedRemainingMs: number | null;
  /** Kiedy przerwa się zakończyła — stan „Czas!” (ms). */
  finishedAt: number | null;
  /** Identyfikator zaplanowanego powiadomienia (push) — do anulowania. */
  pushScheduleId: string | null;
  /**
   * Aktualny czas (ms) — odświeżany raz na sekundę, gdy timer działa.
   *
   * Komponenty liczą z tego pozostały czas, zamiast wołać `Date.now()`
   * w trakcie renderu (wartość z renderu by się zamroziła do następnej
   * zmiany stanu, a stan zmienia się tylko przy start/pauzie/koniecu).
   */
  now: number;
}

const SETTINGS_KEY = 'fitplanner-rest-timer';
const STATE_KEY = 'fitplanner-rest-timer-state';

export const DEFAULT_SETTINGS: RestTimerSettings = {
  defaultDurationMs: DEFAULT_REST_MS,
  autoStart: true,
  soundEnabled: true,
  vibrationEnabled: true,
  keepScreenOn: true,
  pushEnabled: false,
};

const INITIAL_STATE: RestTimerState = {
  endsAt: null,
  startedAt: null,
  durationMs: DEFAULT_REST_MS,
  paused: false,
  pausedRemainingMs: null,
  finishedAt: null,
  pushScheduleId: null,
  now: Date.now(),
};

/* ── Ustawienia ──────────────────────────────────────────────────────────── */

function loadSettings(): RestTimerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        defaultDurationMs:
          typeof p.defaultDurationMs === 'number'
            ? clampDuration(p.defaultDurationMs)
            : DEFAULT_SETTINGS.defaultDurationMs,
        autoStart: typeof p.autoStart === 'boolean' ? p.autoStart : DEFAULT_SETTINGS.autoStart,
        soundEnabled:
          typeof p.soundEnabled === 'boolean' ? p.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
        vibrationEnabled:
          typeof p.vibrationEnabled === 'boolean'
            ? p.vibrationEnabled
            : DEFAULT_SETTINGS.vibrationEnabled,
        keepScreenOn:
          typeof p.keepScreenOn === 'boolean' ? p.keepScreenOn : DEFAULT_SETTINGS.keepScreenOn,
        pushEnabled:
          typeof p.pushEnabled === 'boolean' ? p.pushEnabled : DEFAULT_SETTINGS.pushEnabled,
      };
    }
  } catch {
    /* uszkodzony JSON — ustawienia domyślne */
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: RestTimerSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ustawienia zostają tylko w pamięci sesji */
  }
}

/* ── Stan timera ─────────────────────────────────────────────────────────── */

function loadState(): RestTimerState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    const p = JSON.parse(raw);
    if (typeof p.endsAt !== 'number') return { ...INITIAL_STATE };

    // Przerwa, która powinna była się skończyć w czasie, gdy aplikacja nie
    // była otwarta — od razu ją zamykamy (bez dźwięku: użytkownika nie ma).
    if (Date.now() >= p.endsAt) {
      return { ...INITIAL_STATE };
    }
    return {
      endsAt: p.endsAt,
      startedAt: typeof p.startedAt === 'number' ? p.startedAt : Date.now(),
      durationMs: typeof p.durationMs === 'number' ? p.durationMs : DEFAULT_REST_MS,
      paused: false,
      pausedRemainingMs: null,
      finishedAt: null,
      pushScheduleId: null,
      now: Date.now(),
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState(state: RestTimerState) {
  try {
    if (state.endsAt == null) {
      localStorage.removeItem(STATE_KEY);
    } else {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          endsAt: state.endsAt,
          startedAt: state.startedAt,
          durationMs: state.durationMs,
        }),
      );
    }
  } catch {
    /* brak dostępu do localStorage — timer działa w pamięci sesji */
  }
}

/* ── Singleton ───────────────────────────────────────────────────────────── */

let settings: RestTimerSettings = typeof localStorage !== 'undefined' ? loadSettings() : { ...DEFAULT_SETTINGS };
let state: RestTimerState = typeof localStorage !== 'undefined' ? loadState() : { ...INITIAL_STATE };

const listeners = new Set<() => void>();
let tickTimer: number | null = null;
let lastTickSecond: number | null = null;
let lastVibrateSecond: number | null = null;

function emit() {
  listeners.forEach(l => {
    try {
      l();
    } catch {
      /* słuchacz nie może wywrócić aplikacji */
    }
  });
}

/**
 * Aktualizuje stan i powiadamia słuchaczy.
 *
 * `persist = false` pomija zapis do localStorage — używane przy odświeżaniu
 * zegara (raz na sekundę), bo zapisywanie do localStorage jest synchroniczne
 * i potrafi przyciąć klatki na słabym telefonie.
 */
function setState(patch: Partial<RestTimerState>, persist = true) {
  state = { ...state, ...patch };
  if (persist) saveState(state);
  emit();
}

function setSettings(patch: Partial<RestTimerSettings>) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  emit();
}

/** Uruchamia odliczanie (tylko gdy timer jest aktywny). */
function ensureTicking() {
  if (tickTimer != null) return;
  tickTimer = window.setInterval(tick, 250);
}

function stopTicking() {
  if (tickTimer == null) return;
  window.clearInterval(tickTimer);
  tickTimer = null;
  lastTickSecond = null;
  lastVibrateSecond = null;
}

/** Sprawdza, czy przerwa się skończyła (i ogłasza koniec). */
function tick() {
  if (state.endsAt == null || state.paused) return;

  const now = Date.now();
  const left = state.endsAt - now;

  // Odświeżamy czas w stanie RAZ na sekundę — tyle wystarczy do
  // wyświetlania liczby, a komponenty nie renderują się w kółko.
  const second = Math.floor(now / 1000);
  if (second !== lastTickSecond) {
    lastTickSecond = second;
    setState({ now }, false);
  }

  // Delikatne wibracje w ostatnich 3 sekundach — sygnał „zaraz koniec”
  // bez patrzenia w telefon (Android). Raz na sekundę.
  const secondsLeft = Math.ceil(left / 1000);
  if (secondsLeft <= 3 && secondsLeft > 0 && secondsLeft !== lastVibrateSecond) {
    lastVibrateSecond = secondsLeft;
    if (settings.vibrationEnabled) vibrateTick();
  }

  if (left <= 0) finish();
}

/** Kończy przerwę: dźwięk, wibracja, zwolnienie ekranu. */
function finish() {
  const wasActive = state.endsAt != null;
  stopTicking();

  if (settings.soundEnabled) playBell();
  if (settings.vibrationEnabled) vibrateDone();

  // Powiadomienie systemowe: jeśli aplikacja była w tle, lokalny dźwięk
  // nie zagrał — wtedy powiadomienie zostawiamy (push sam się wyśle).
  // Jeśli aplikacja była na wierzchu, anulujemy push, żeby nie dublować.
  if (wasActive && state.pushScheduleId) {
    void cancelRestTimerPush(state.pushScheduleId);
  }

  void releaseWakeLock();

  setState({
    endsAt: null,
    startedAt: null,
    paused: false,
    pausedRemainingMs: null,
    finishedAt: Date.now(),
    pushScheduleId: null,
  });
}

/* ── Akcje ───────────────────────────────────────────────────────────────── */

/** Startuje przerwę o podanym czasie. */
export function startRestTimer(durationMs: number): void {
  const duration = clampDuration(durationMs);
  const now = Date.now();

  // Nowa przerwa → żaden dzwonek z poprzedniej nie może się jeszcze odezwać
  // (np. z przerwy zakończonej, gdy aplikacja była w tle).
  cancelPendingBell();

  // Dźwięk przygotowujemy przy starcie — to gest użytkownika, więc
  // przeglądarka pozwoli zagrać później, bez kolejnego dotknięcia.
  // Web Audio nie potrzebuje bezgłośnego „odblokowania”, które przejmowało
  // focus audio i zatrzymywało muzykę użytkownika.
  if (settings.soundEnabled) void prepareBell();

  setState({
    endsAt: now + duration,
    startedAt: now,
    durationMs: duration,
    paused: false,
    pausedRemainingMs: null,
    finishedAt: null,
    pushScheduleId: null,
  });

  ensureTicking();

  // Ekran nie gasnąłby sam — dzięki temu strona nie zostanie zamrożona
  // i timer działa poprawnie, dopóki użytkownik nie przejdzie do innej apki.
  if (settings.keepScreenOn) void acquireWakeLock();

  // Powiadomienie systemowe jako zabezpieczenie na wypadek uśpienia apki.
  if (settings.pushEnabled) {
    void scheduleRestTimerPush(now + duration).then(id => {
      if (id && state.endsAt != null) {
        setState({ pushScheduleId: id });
      }
    });
  }
}

/** Startuje przerwę z domyślnym czasem. */
export function startDefaultRestTimer(): void {
  startRestTimer(settings.defaultDurationMs);
}

/** Wstrzymuje przerwę. */
export function pauseRestTimer(): void {
  if (state.endsAt == null || state.paused) return;
  const remaining = Math.max(0, state.endsAt - Date.now());
  stopTicking();
  void releaseWakeLock();
  setState({ paused: true, pausedRemainingMs: remaining });
}

/** Wznawia wstrzymaną przerwę. */
export function resumeRestTimer(): void {
  if (!state.paused || state.pausedRemainingMs == null) return;
  const now = Date.now();
  setState({
    endsAt: now + state.pausedRemainingMs,
    startedAt: now,
    paused: false,
    pausedRemainingMs: null,
  });
  ensureTicking();
  if (settings.keepScreenOn) void acquireWakeLock();
}

/** Dodaje (lub odejmuje) sekundy do bieżącej przerwy. */
export function addRestTimerSeconds(seconds: number): void {
  if (state.endsAt == null) return;
  const now = Date.now();
  const left = Math.max(0, state.endsAt - now);
  const next = Math.max(0, left + seconds * 1000);
  setState({
    endsAt: now + next,
    durationMs: Math.max(state.durationMs, next),
  });
  ensureTicking();
}

/** Kończy przerwę przedwcześnie (anulowanie przez użytkownika). */
export function stopRestTimer(): void {
  stopTicking();
  void releaseWakeLock();
  // Anulujemy też oczekujący dzwonek — zatrzymana przerwa nie zadzwoni.
  cancelPendingBell();
  if (state.pushScheduleId) void cancelRestTimerPush(state.pushScheduleId);
  setState({
    endsAt: null,
    startedAt: null,
    paused: false,
    pausedRemainingMs: null,
    finishedAt: null,
    pushScheduleId: null,
  });
}

/** Chowa stan „Czas!” po jego wyświetleniu. */
export function dismissFinished(): void {
  if (state.finishedAt == null) return;
  setState({ finishedAt: null });
}

/** Aktualizuje ustawienia timera. */
export function updateRestTimerSettings(patch: Partial<RestTimerSettings>): void {
  setSettings(patch);
}

/* ── Odczyt ──────────────────────────────────────────────────────────────── */

export function getRestTimerState(): RestTimerState {
  return state;
}

export function getRestTimerSettings(): RestTimerSettings {
  return settings;
}

export function subscribeRestTimer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Hook Reactowy — stan timera (aktualizowany automatycznie). */
export function useRestTimer(): RestTimerState {
  return useSyncExternalStore(subscribeRestTimer, getRestTimerState, getRestTimerState);
}

/** Hook Reactowy — ustawienia timera. */
export function useRestTimerSettings(): {
  settings: RestTimerSettings;
  update: (patch: Partial<RestTimerSettings>) => void;
} {
  const s = useSyncExternalStore(subscribeRestTimer, getRestTimerSettings, getRestTimerSettings);
  return { settings: s, update: updateRestTimerSettings };
}

/**
 * Uruchamia odliczanie od nowa (gdy timer był aktywny przy starcie aplikacji).
 *
 * Wywoływane raz, przy montowaniu aplikacji — pilnuje, żeby przerwa
 * zapisana w localStorage zaczęła się odliczać od razu po odświeżeniu.
 *
 * Przy okazji odzyskuje „nie wygaszanie ekranu": po przeładowaniu strony
 * przeglądarka nie pamięta wcześniejszego Wake Locka, a ekran wygasłby
 * tak samo jak przed zmianą.
 */
export function resumeRestTimerTicking(): void {
  if (state.endsAt != null && !state.paused) {
    if (Date.now() >= state.endsAt) {
      finish();
      return;
    }
    ensureTicking();
    if (settings.keepScreenOn) void acquireWakeLock();
  }
}
