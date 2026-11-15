import { useSyncExternalStore } from 'react';
import { clampDuration, DEFAULT_REST_MS } from '../lib/restTimer';
import {
  acquireWakeLock,
  canPlayBell,
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
   * Po której serii jest przerwa (nazwa ćwiczenia).
   *
   * Pasek timera jest globalny, więc bez tego użytkownik nie wie, po czym
   * odpoczywa — a to najczęstsze pytanie przy kilku ćwiczeniach pod rząd.
   */
  restLabel: string | null;
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
  restLabel: null,
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
      restLabel: typeof p.restLabel === 'string' ? p.restLabel : null,
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
          restLabel: state.restLabel,
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

  // Tuż przed końcem przerwy zgłaszamy serwerowi, że alarm odbierze
  // LOKALNY dzwonek — i prosimy o rezygnację z powiadomienia systemowego.
  //
  // Robimy to z wyprzedzeniem (a nie w momencie zakończenia), żeby serwer
  // nie musiał czekać długiego „okna” na anulowanie. Dzięki temu
  // powiadomienie na ZABLOKOWANYM telefonie (gdzie nikt nie anuluje)
  // przychodzi o ~1,2 s wcześniej.
  //
  // Warunek: dzwonek musi być gotowy — inaczej wyciszylibyśmy push,
  // a alarm i tak by nie zagrał.
  if (
    state.pushScheduleId &&
    left > 0 &&
    left <= PUSH_SELF_ALARM_LEAD_MS &&
    !pushSelfAlarmSignalled &&
    canPlayBell()
  ) {
    pushSelfAlarmSignalled = true;
    void cancelRestTimerPush(state.pushScheduleId);
  }

  if (left <= 0) finish();
}

/**
 * Ile wcześniej (przed końcem przerwy) zgłaszamy serwerowi, że alarm
 * odbierze lokalny dzwonek.
 *
 * Dzięki temu powiadomienie systemowe nie dubluje się z dzwonkiem, a serwer
 * nie musi czekać długiego „okna” na anulowanie — czyli powiadomienie
 * na zablokowanym telefonie przychodzi szybciej.
 */
const PUSH_SELF_ALARM_LEAD_MS = 700;

/** Czy zgłosiliśmy już serwerowi, że alarm odbierze dzwonek. */
let pushSelfAlarmSignalled = false;

/**
 * Numer generacji harmonogramu push.
 *
 * Chroni przed wyścigiem: odpowiedź serwera na żądanie harmonogramu może
 * przyjść po tym, jak zaczęła się kolejna przerwa. Bez generacji stary
 * identyfikator nadpisałby nowy i przerwa przestałaby być anulowana.
 */
let pushScheduleGeneration = 0;

/**
 * Ile opóźnienia tolerujemy przy ogłaszaniu końca przerwy.
 *
 * Gdy przerwa kończy się, a użytkownik PATRZY na ekran, zegar odchodzi
 * o ułamek sekundy — wtedy gramy dzwonek i wibrujemy.
 *
 * Ale gdy przerwa minęła, gdy aplikacja była w tle (ekran zgaszony albo
 * telefon zablokowany), przy powrocie do aplikacji zegar „nadrabia”
 * spóźnienie rzędu minut. Dzwonek w takiej chwili byłby mylący — alarmem
 * było już powiadomienie systemowe, które dotarło do użytkownika.
 */
const MAX_ALARM_LAG_MS = 4000;

/** Kończy przerwę: dźwięk, wibracja, zwolnienie ekranu. */
function finish() {
  const wasActive = state.endsAt != null;
  const overdueMs = wasActive ? Date.now() - (state.endsAt ?? 0) : 0;
  stopTicking();

  // Dźwięk i wibracja tylko wtedy, gdy użytkownik NAPRAWDĘ czekał na koniec
  // przerwy (przerwa skończyła się przed chwilą, a aplikacja była na
  // wierzchu). Przerwa, która minęła w tle, kończy się bez dźwięku —
  // jej alarmem było powiadomienie systemowe.
  const userWasWaiting = overdueMs <= MAX_ALARM_LAG_MS;

  if (userWasWaiting) {
    if (settings.soundEnabled) playBell();
    if (settings.vibrationEnabled) vibrateDone();
  }

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

/**
 * Startuje przerwę o podanym czasie.
 *
 * `label` to nazwa ćwiczenia, po którym jest przerwa — pokazuje ją pasek
 * („po: Przysiad"), bo sam timer jest globalny.
 */
export function startRestTimer(durationMs: number, label?: string | null): void {
  const duration = clampDuration(durationMs);
  const now = Date.now();

  // Nowa przerwa → żaden dzwonek z poprzedniej nie może się jeszcze odezwać
  // (np. z przerwy zakończonej, gdy aplikacja była w tle).
  cancelPendingBell();
  pushSelfAlarmSignalled = false;

  // Poprzednia przerwa została ZASTĄPIONA nową — jej powiadomienie
  // systemowe nie może już dotrzeć. Bez tego użytkownik dostawałby alarm
  // po anulowaniu timera: stary harmonogram zostawał na serwerze, a jego
  // identyfikator ginął w sklepie (zastępowała go nowa przerwa).
  const previousPushId = state.pushScheduleId;
  if (previousPushId) {
    void cancelRestTimerPush(previousPushId);
  }

  // Dźwięk przygotowujemy przy starcie — to gest użytkownika, więc
  // przeglądarka pozwoli zagrać później, bez kolejnego dotknięcia.
  // Web Audio nie potrzebuje bezgłośnego „odblokowania", które przejmowało
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
    restLabel: label ?? null,
  });

  ensureTicking();

  // Ekran nie gasnąłby sam — dzięki temu strona nie zostanie zamrożona
  // i timer działa poprawnie, dopóki użytkownik nie przejdzie do innej apki.
  if (settings.keepScreenOn) void acquireWakeLock();

  // Powiadomienie systemowe jako zabezpieczenie na wypadek uśpienia apki.
  if (settings.pushEnabled) {
    const generation = ++pushScheduleGeneration;
    void scheduleRestTimerPush(now + duration).then(id => {
      // Odpowiedź serwera mogła przyjść PO tym, jak zaczęła się kolejna
      // przerwa albo gdy ta już się zakończyła — wtedy ten identyfikator
      // już niczego nie dotyczy i nie wolno go zapamiętać.
      if (!id || generation !== pushScheduleGeneration) return;

      if (state.endsAt == null) {
        // Przerwa zdążyła się zakończyć — anulujemy, żeby push nie przyszedł.
        void cancelRestTimerPush(id);
        return;
      }

      setState({ pushScheduleId: id });
    });
  }
}

/** Startuje przerwę z domyślnym czasem. */
export function startDefaultRestTimer(label?: string | null): void {
  startRestTimer(settings.defaultDurationMs, label);
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
    // Przy wydłużeniu rośnie całkowity czas przerwy, przy skróceniu maleje.
    durationMs: seconds >= 0 ? Math.max(state.durationMs, next) : next,
  });
  ensureTicking();
}

/**
 * Ustawia pozostały czas TRWAJĄCEJ przerwy (np. wybrany preset).
 *
 * Używane przez panel czasu, gdy przerwa już trwa — zamiast nadpisywać
 * ją nową, zmieniamy tylko ile zostało.
 */
export function setRestTimerRemaining(durationMs: number): void {
  if (state.endsAt == null) return;
  const duration = clampDuration(durationMs);
  const now = Date.now();
  setState({
    endsAt: now + duration,
    durationMs: duration,
    startedAt: now,
    paused: false,
    pausedRemainingMs: null,
  });
  ensureTicking();
}

/**
 * Zmienia DOMYŚLNY czas przerwy (używane przez przyciski ± przy trackingu,
 * gdy żadna przerwa nie trwa).
 */
export function changeDefaultRestSeconds(seconds: number): void {
  const next = clampDuration(settings.defaultDurationMs + seconds * 1000);
  setSettings({ defaultDurationMs: next });
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
