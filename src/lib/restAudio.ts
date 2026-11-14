/**
 * Dźwięk, wibracje i utrzymanie ekranu włączonego — dla timera odpoczynku.
 *
 * Dlaczego `<audio>` z plikiem, a nie Web Audio?
 * Na iOS Web Audio (AudioContext) jest traktowane jako dźwięk „ambient” —
 * system wycisza go, gdy aplikacja nie jest na wierzchu (WebKit bug 198277).
 * Plik odtwarzany przez `<audio>` w standalone PWA gra dalej w tle
 * (iOS 15.4+). Dlatego alarm budujemy na elemencie `<audio>`.
 *
 * Dlaczego Wake Lock, a nie biblioteka no-sleep.js?
 * Wake Lock API jest w przeglądarkach od 2020 r. (Chrome 84), Safari 16.4,
 * Firefox 126. Biblioteka dodałaby zależność i plik wideo, a my potrzebujemy
 * tylko ~30 linii kodu. Gdy ekran nie gaśnie sam, strona nie jest
 * zamrażana, a timer działa poprawnie.
 */

/**
 * Plik dźwiękowy dzwonka.
 *
 * Vite zamienia go na `data:` URI (aplikacja budowana jest jako jeden plik
 * HTML), więc dźwięk działa offline i nie wymaga osobnego żądania sieciowego.
 */
import bellUrl from '../assets/rest-bell.wav';

/* ── Wake Lock ───────────────────────────────────────────────────────────── */

interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
}

let wakeLock: WakeLockSentinelLike | null = null;
let wakeLockWanted = false;

function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/**
 * Prosi system o niegaszenie ekranu.
 *
 * Musi być wywołane z gestu użytkownika (tak wymaga przeglądarka) —
 * dlatego wywołujemy to przy starcie timera, nie w tle.
 */
export async function acquireWakeLock(): Promise<boolean> {
  if (!wakeLockSupported()) return false;

  try {
    const sentinel = await (navigator as unknown as {
      wakeLock: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
    }).wakeLock.request('screen');

    wakeLock = sentinel;
    wakeLockWanted = true;

    // System może zabrać lock (np. przy niskim stanie baterii) — wtedy
    // próbujemy odzyskać go, gdy tylko ekran wróci do przodu.
    sentinel.addEventListener('release', () => {
      if (wakeLock === sentinel) wakeLock = null;
      if (wakeLockWanted && document.visibilityState === 'visible') {
        void acquireWakeLock();
      }
    });

    return true;
  } catch {
    // Brak wsparcia albo odrzucone (np. iframe bez allow="screen-wake-lock").
    return false;
  }
}

/** Zwalnia lock ekranu. */
export async function releaseWakeLock(): Promise<void> {
  wakeLockWanted = false;
  const sentinel = wakeLock;
  wakeLock = null;
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    /* zwolnienie nieudane — i tak lock już nie istnieje */
  }
}

/** Czy ekran jest aktualnie trzymany włączony. */
export function isWakeLockActive(): boolean {
  return wakeLock != null && !wakeLock.released;
}

/**
 * Odtwarza zdarzenie `visibilitychange` — po powrocie na kartę odzyskujemy
 * lock (przeglądarka zwalnia go przy każdym przejściu w tło).
 */
export function bindWakeLockRecovery(): () => void {
  const onVisibility = () => {
    if (wakeLockWanted && document.visibilityState === 'visible' && !wakeLock) {
      void acquireWakeLock();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}

/* ── Dźwięk ──────────────────────────────────────────────────────────────── */

/** Element odtwarzający — jeden na całą aplikację. */
let bellElement: HTMLAudioElement | null = null;
let bellUnlocked = false;

function getBell(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!bellElement) {
    bellElement = new Audio(bellUrl);
    bellElement.preload = 'auto';
    bellElement.volume = 1;
  }
  return bellElement;
}

/**
 * „Odblokowuje” dźwięk — przeglądarki wymagają gestu użytkownika.
 *
 * Wywołujemy to przy starcie timera (jest gestem), więc późniejszy alarm
 * zadziała nawet bez kolejnego dotknięcia.
 *
 * Używamy `volume = 0`, a nie `muted` — na iOS to odtwarzanie (nawet
 * bezgłośne) tworzy sesję audio, dzięki czemu aplikacja może grać dalej
 * w tle. Samo `muted` nie zawsze ją tworzy.
 */
export function unlockBell(): void {
  if (bellUnlocked) return;
  const el = getBell();
  if (!el) return;

  try {
    el.volume = 0;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        el.pause();
        el.currentTime = 0;
        el.volume = 1;
        bellUnlocked = true;
      }).catch(() => {
        el.volume = 1;
      });
    } else {
      el.volume = 1;
      bellUnlocked = true;
    }
  } catch {
    /* przeglądarka odmówiła — alarm po prostu nie zagra */
  }
}

/**
 * Odblokowuje dźwięk przy PIERWSZYM geście w aplikacji.
 *
 * Dzięki temu alarm zadziała także wtedy, gdy przerwa zaczęła się
 * przed przeładowaniem strony (albo gdy użytkownik sam ustawił czas
 * w ustawieniach, a nie przyciskiem w trackerze).
 *
 * Zwraca funkcję sprzątającą (usuwa nasłuch).
 */
export function bindBellUnlockOnFirstGesture(): () => void {
  if (bellUnlocked) return () => {};

  const onGesture = () => {
    unlockBell();
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
  };

  window.addEventListener('pointerdown', onGesture, { once: true });
  window.addEventListener('keydown', onGesture, { once: true });

  return () => {
    window.removeEventListener('pointerdown', onGesture);
    window.removeEventListener('keydown', onGesture);
  };
}

/** Odgrywa dzwonek końca przerwy. */
export function playBell(): void {
  const el = getBell();
  if (!el) return;
  try {
    el.volume = 1;
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignorujemy — dźwięk jest dodatkiem, nie jedynym sygnałem */
  }
}

/* ── Wibracje ────────────────────────────────────────────────────────────── */

/** Czy urządzenie obsługuje wibracje (iOS nie obsługuje). */
export function vibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Wibracja przy końcu przerwy.
 *
 * Android: trzy krótkie wibracje — czytelne „bębenek" bez patrzenia
 * w telefon. iOS: brak API, nic się nie stanie (dlatego dźwięk i pasek
 * są wizualnym backupiem).
 */
export function vibrateDone(): void {
  if (!vibrationSupported()) return;
  try {
    navigator.vibrate([120, 90, 120]);
  } catch {
    /* ignorujemy */
  }
}

/** Delikatne wibracje przy ostatnich 3 sekundach. */
export function vibrateTick(): void {
  if (!vibrationSupported()) return;
  try {
    navigator.vibrate(30);
  } catch {
    /* ignorujemy */
  }
}
