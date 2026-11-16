import { supabase, isSupabaseConfigured } from './supabase';
import { MAX_PUSH_DELAY_MS, PUSH_FUNCTION, VAPID_PUBLIC_KEY } from './pushConfig';

/**
 * Klient Web Push — subskrypcja i planowanie powiadomienia o końcu przerwy.
 *
 * Po co to w ogóle, skoro timer działa w aplikacji?
 * Bo na telefonie zdarza się scenariusz, w którym dźwięk nie zagra:
 * użytkownik przełączył się do innej apki, ekran wygasł albo system
 * usypił aplikację. Powiadomienie systemowe jest wtedy jedynym sygnałem,
 * bo dociera nawet do zablokowanego ekranu.
 *
 * Wymagania platformy:
 *  • iOS 16.4+ i TYLKO aplikacja dodana do ekranu głównego,
 *  • zgoda na powiadomienia musi być poproszona przy geście użytkownika,
 *  • subskrypcja musi pokazywać powiadomienie (WebKit odbiera uprawnienie,
 *    gdy push nie kończy się `showNotification`).
 */

/** Czy przeglądarka w ogóle obsługuje Web Push. */
export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  if (!('PushManager' in window)) return false;
  if (!('Notification' in window)) return false;
  return true;
}

/** Czy aplikacja działa w trybie samodzielnym (ikona na ekranie głównym). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

/** Zwraca klucz publiczny VAPID w formacie wymaganym przez Push API. */
function vapidKeyArray(): Uint8Array {
  const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
  const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Prosi o zgodę na powiadomienia.
 *
 * Wywoływane WYŁĄCZNIE z gestu użytkownika (iOS wymaga dokładnie tego).
 */
export async function requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (!isStandalone()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/** Rejestruje serwis workera (potrzebny do odbierania pushy). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    // Jeśli worker już jest zarejestrowany, nie ruszamy go — `register()`
    // przy każdym wywołaniu to zbędne dotknięcie workera.
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/**
 * Zwraca (a w razie potrzeby tworzy) subskrypcję push.
 *
 * Subskrypcja jest jedna na urządzenie — nie duplikujemy jej przy każdym
 * starcie timera.
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyArray() as BufferSource,
    });
  } catch {
    return null;
  }
}

/**
 * Czeka na wynik, ale nie dłużej niż `ms`.
 *
 * Po przekroczeniu limitu zwracamy `null` — a obiecany obiekt w tle
 * dalej pracuje (nic się nie psuje).
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Wysyła subskrypcję do serwera (Edge Function zapisuje ją w bazie).
 *
 * To zarówno „zapisz", jak i „odśwież" — upsert po `endpoint` jest
 * idempotentny. Wywołujemy to **przed każdym planowaniem powiadomienia**,
 * bo subskrypcja w przeglądarce potrafi zniknąć (przeinstalowanie PWA,
 * wyczyszczenie danych witryny) albo wygasnąć po stronie APNs. Serwer
 * trzymałby wtedy martwy endpoint, powiadomienia nie dochodziłyby,
 * a użytkownik nie miałby jak się o tym dowiedzieć.
 *
 * `timeoutMs` chroni przed zawieszeniem: tworzenie nowej subskrypcji w FCM
 * potrafi trwać kilka sekund, a planowania powiadomienia nie wolno z tego
 * powodu opóźniać — wolno je **pominąć**, nie wolno go **zatrzymać**.
 */
export async function registerSubscription(timeoutMs = 2500): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const wynik = await withTimeout(
    (async () => {
      const sub = await getPushSubscription();
      if (!sub) return false;

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.auth || !json.keys?.p256dh) return false;

      const { error } = await supabase.functions.invoke(PUSH_FUNCTION, {
        body: {
          action: 'subscribe',
          subscription: {
            endpoint: json.endpoint,
            keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
          },
        },
      });

      return !error;
    })(),
    timeoutMs,
  );

  return wynik === true;
}

/** Wynik planowania powiadomienia — z powodem porażki. */
export type PushPlanResult =
  | { ok: true; id: string }
  | { ok: false; powod: 'brak-subskrypcji' | 'blad-serwera' };

/**
 * Prosi serwer o powiadomienie w chwili `endsAt`.
 *
 * Zwraca identyfikator harmonogramu (do późniejszego anulowania) albo
 * powód, dla którego powiadomienia nie dało się zamówić — żeby aplikacja
 * mogła powiedzieć o tym wprost, zamiast milczeć.
 */
export async function scheduleRestTimerPush(endsAt: number): Promise<PushPlanResult> {
  if (!isSupabaseConfigured) return { ok: false, powod: 'brak-subskrypcji' };

  const delay = endsAt - Date.now();
  if (delay <= 0 || delay > MAX_PUSH_DELAY_MS) return { ok: false, powod: 'brak-subskrypcji' };

  try {
    const { data, error } = await supabase.functions.invoke(PUSH_FUNCTION, {
      body: {
        action: 'schedule',
        endsAt,
        title: 'Czas!',
        body: 'Przerwa minęła — możesz zacząć kolejną serię.',
      },
    });
    if (error) return { ok: false, powod: 'blad-serwera' };
    const id = (data as { id?: string } | null)?.id;
    if (typeof id !== 'string') return { ok: false, powod: 'blad-serwera' };
    return { ok: true, id };
  } catch {
    return { ok: false, powod: 'blad-serwera' };
  }
}

/** Powód anulowania zaplanowanego powiadomienia. */
export type PushCancelReason =
  /** Użytkownik sam zatrzymał przerwę — push nie zostanie wysłany. */
  | 'uzytkownik'
  /** Alarm odbierze lokalny dzwonek (aplikacja na wierzchu). */
  | 'samoalarm'
  /** Przerwa została wstrzymana. */
  | 'pauza'
  /** Nowa przerwa zastąpiła poprzednią. */
  | 'zastapienie'
  /** Przerwa zdążyła się zakończyć, zanim serwer odpowiedział. */
  | 'zakonczona'
  /**
   * Harmonogram przestał być aktualny, zanim do nas dotarła odpowiedź serwera
   * (przerwa anulowana albo zastąpiona nową) — wygaszamy go, żeby nie
   * przyszło powiadomienie dla przerwy, która już nie istnieje.
   */
  | 'nieaktualny';

/**
 * Anuluje zaplanowane powiadomienie (gdy timer zatrzymano przed czasem).
 *
 * Powód idzie razem z żądaniem — serwer zapisuje go w logach, więc widać
 * potem, czy push został wyciszony przez użytkownika, czy przez dzwonek.
 */
export async function cancelRestTimerPush(
  id: string,
  powod: PushCancelReason = 'uzytkownik'
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.functions.invoke(PUSH_FUNCTION, {
      body: { action: 'cancel', id, powod },
    });
  } catch {
    /* anulowanie jest najlepsze-effort — jeśli się nie uda, powiadomienie
       i tak dotrze, ale to tylko dokładność, nie awaria */
  }
}
