/**
 * Dźwięk, wibracje i utrzymanie ekranu włączonego — dla timera odpoczynku.
 *
 * ── Dlaczego Web Audio, a nie `<audio>`? ───────────────────────────────────
 * Element `<audio>` domyślnie zajmuje sesję audio typu **playback**, czyli
 * **wyłączną** — telefon wstrzymuje wtedy Twoją muzykę (Spotify) na czas
 * odtwarzania. Do tego samo odtworzenie „na próbę” (bezgłośne) przejmowało
 * focus przy KAŻDYM starcie timera, czyli muzyka zatrzymywała się co
 * serię.
 *
 * Web Audio (`AudioContext`) domyślnie działa w sesji **ambient**, czyli
 * **miesza się** z innym dźwiękiem i nie zabiera nikomu focusu.
 *
 * Koszt: na iOS Web Audio jest wyciszany przełącznikiem bocznym (tryb
 * cichy) i jest wstrzymywany w tle. To świadoma decyzja — za cenę
 * „dzwonek w tle” płacimy tym, że **nie zaburzamy muzyki**. Alarm przy
 * zablokowanym ekranie i tak robi powiadomienie systemowe (push).
 *
 * Dodatkowo, gdzie przeglądarka zna Audio Session API (Safari/iOS 16.4+,
 * Chrome 157+), ustawiamy sesję na **transient** — to semantyka
 * „krótkiego dźwięku-powiadomienia”: wgrywa się na muzykę zamiast ją
 * pauzować.
 *
 * ── Dlaczego Wake Lock, a nie biblioteka no-sleep.js? ──────────────────────
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
 * Prosi system o niewygaszanie ekranu.
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

/* ── Sesja audio ─────────────────────────────────────────────────────────── */

interface AudioSessionLike {
  type: string;
  state?: string;
}

/**
 * Ustawia typ sesji audio na „transient”.
 *
 * „Transient” to semantyka krótkiego dźwięku-powiadomienia: wgrywa się na
 * to, co już gra, zamiast wstrzymywać inne odtwarzanie. Dzięki temu
 * dzwonek nie zatrzymuje Spotify.
 *
 * API jest świeże (Safari/iOS 16.4+, Chrome 157+), więc sprawdzamy
 * jego obecność i ignorujemy brak.
 */
function configureTransientSession(): void {
  if (typeof navigator === 'undefined') return;
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  if (!session) return;
  try {
    session.type = 'transient';
  } catch {
    /* sesja mogła być już aktywna — zostawiamy, co było */
  }
}

/* ── Dźwięk ──────────────────────────────────────────────────────────────── */

type AudioContextCtor = new () => AudioContext;

let audioContext: AudioContext | null = null;
let bellBuffer: AudioBuffer | null = null;
let bellPrepared = false;
/** Trwające przygotowanie dźwięku — chroni przed podwójnym dekodowaniem. */
let preparePromise: Promise<void> | null = null;
/**
 * Token alarmu — zmiana unieważnia oczekujące odtworzenie dzwonka.
 *
 * Bez niego dzwonek z przerwy zakończonej w tle zadzwoniłby w losowym
 * momencie (przy najbliższym dotknięciu, gdy iOS wreszcie pozwoli na
 * wznowienie sesji audio).
 */
let bellToken = 0;
/** Odliczany czas „świeżości” oczekującego odtworzenia. */
let pendingPlayTimer: number | null = null;
/** Ile czekamy na wzbudzenie kontekstu, zanim dzwonek „wygaśnie”. */
const BELL_FRESH_MS = 2500;

/** Element `<audio>` — tylko awaryjnie, gdy Web Audio nie zadziała. */
let fallbackElement: HTMLAudioElement | null = null;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Zamienia `data:` URI na surowe bajty (bez dodatkowego żądania sieciowego). */
function dataUriToArrayBuffer(dataUri: string): ArrayBuffer | null {
  const comma = dataUri.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUri.slice(0, comma);
  const payload = dataUri.slice(comma + 1);

  try {
    if (meta.includes(';base64')) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
    return new TextEncoder().encode(decodeURIComponent(payload)).buffer;
  } catch {
    return null;
  }
}

/** Pobiera bajty pliku dźwiękowego (build → data URI, dev → adres URL). */
async function loadBellBytes(): Promise<ArrayBuffer | null> {
  if (bellUrl.startsWith('data:')) return dataUriToArrayBuffer(bellUrl);

  try {
    const res = await fetch(bellUrl);
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Przygotowuje dźwięk — wołane z gestu użytkownika.
 *
 * Przeglądarki wymagają gestu, żeby pozwolić na odtwarzanie. Tworzymy
 * kontekst Web Audio i dekodujemy plik; od tej chwili dzwonek może zagrać
 * w dowolnej chwili, bez kolejnego dotknięcia.
 *
 * Web Audio nie potrzebuje „odblokowującego” bezgłośnego odtwarzania —
 * a to właśnie ono przejmowało focus audio i zatrzymywało muzykę
 * przy każdym starcie timera.
 */
export function prepareBell(): Promise<void> {
  // Dwa wywołania w tej samej chwili (start timera + pierwszy gest) nie
  // mogą dekodować pliku dwa razy — dlatego trzymamy jedną operację.
  if (preparePromise) return preparePromise;

  preparePromise = prepareBellInternal().finally(() => {
    preparePromise = null;
  });
  return preparePromise;
}

async function prepareBellInternal(): Promise<void> {
  configureTransientSession();

  const Ctor = getAudioContextCtor();
  if (!Ctor) return;

  try {
    if (!audioContext) {
      audioContext = new Ctor();
    }

    // Wzbudzenie kontekstu odpalamyśmy BEZ oczekiwania na wynik.
    // `resume()` w kontekście bez aktywacji użytkownika może się nigdy
    // nie rozstrzygnąć — a czekanie na niego blokowałooby dekodowanie
    // pliku, czyli dzwonek nigdy by nie zagrał.
    if (audioContext.state === 'suspended') {
      void audioContext.resume().catch(() => {});
    }

    // Dekodowanie działa nawet na wstrzymanym kontekście.
    if (!bellBuffer) {
      const bytes = await loadBellBytes();
      if (!bytes) return;
      bellBuffer = await audioContext.decodeAudioData(bytes);
    }

    bellPrepared = true;
  } catch {
    /* przeglądarka odmówiła — alarm po prostu nie zagra */
  }
}

/** Odgrywa dzwonek z gotowego bufora. */
function playBellFromBuffer(): void {
  if (!audioContext || !bellBuffer) return;
  try {
    const source = audioContext.createBufferSource();
    source.buffer = bellBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch {
    /* ignorujemy — dźwięk jest dodatkiem, nie jedynym sygnałem */
  }
}

/** Awaryjnie: zwykły element `<audio>` (gdy Web Audio zawiedzie). */
function playBellViaElement(): void {
  try {
    if (!fallbackElement && typeof Audio !== 'undefined') {
      fallbackElement = new Audio(bellUrl);
      fallbackElement.preload = 'auto';
    }
    if (!fallbackElement) return;
    fallbackElement.volume = 1;
    fallbackElement.currentTime = 0;
    const p = fallbackElement.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    /* ignorujemy */
  }
}

/** Odgrywa dzwonek końca przerwy. */
export function playBell(): void {
  const token = ++bellToken;

  // 1. Kontekst gotowy i działający — gramy od razu.
  if (audioContext && bellBuffer && audioContext.state === 'running') {
    playBellFromBuffer();
    return;
  }

  // 2. Kontekst istnieje, ale jest wstrzymany (aplikacja była w tle albo
  //    ekran zgaszony). Wzbudzamy go — ale tylko „na świeżo”:
  //
  //    Na iOS `resume()` czeka na aktywację użytkownika i rozstrzyga się
  //    dopiero przy najbliższym dotknięciu. Bez zabezpieczenia dzwonek
  //    zakończonej przerwy zadzwoniłby w losowym momencie — np. przy
  //    zaznaczaniu kolejnej serii, wiele minut później. Dlatego:
  //      • odtworzenie działa tylko w ciągu BELL_FRESH_MS od alarmu,
  //      • każdy nowy alarm (albo anulowanie) unieważnia oczekujący.
  if (audioContext && bellBuffer) {
    const timer = window.setTimeout(() => {
      if (pendingPlayTimer === timer) pendingPlayTimer = null;
      // Dzwonek „wygasł” — nie odezwie się w żadnym późniejszym momencie.
      if (token === bellToken) bellToken++;
    }, BELL_FRESH_MS);
    pendingPlayTimer = timer;

    void audioContext
      .resume()
      .then(() => {
        if (pendingPlayTimer === timer) {
          window.clearTimeout(timer);
          pendingPlayTimer = null;
        }
        if (token !== bellToken) return; // alarm nieaktualny
        playBellFromBuffer();
      })
      .catch(() => {
        if (pendingPlayTimer === timer) {
          window.clearTimeout(timer);
          pendingPlayTimer = null;
        }
      });
    return;
  }

  // 3. Jeszcze nic nie mamy — przygotowujemy i gramy zaraz po tym.
  void prepareBell().then(() => {
    if (token !== bellToken) return;
    if (bellBuffer && audioContext) playBellFromBuffer();
    else playBellViaElement();
  });
}

/**
 * Unieważnia oczekujące odtworzenie dzwonka.
 *
 * Wywoływane przy starcie nowej przerwy i przy jej zatrzymaniu — od
 * tej chwili dzwonek z poprzedniej, zakończonej przerwy już nie zagra.
 */
export function cancelPendingBell(): void {
  bellToken++;
  if (pendingPlayTimer != null) {
    window.clearTimeout(pendingPlayTimer);
    pendingPlayTimer = null;
  }
}

/**
 * Przygotowuje dźwięk przy PIERWSZYM geście w aplikacji.
 *
 * Dzięki temu alarm zadziała także wtedy, gdy przerwa zaczęła się
 * przed przeładowaniem strony (albo gdy użytkownik sam ustawił czas
 * w ustawieniach, a nie przyciskiem w trackerze).
 *
 * Zwraca funkcję sprzątającą (usuwa nasłuch).
 */
export function bindBellPrepareOnFirstGesture(): () => void {
  if (bellPrepared) return () => {};

  const onGesture = () => {
    void prepareBell();
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
