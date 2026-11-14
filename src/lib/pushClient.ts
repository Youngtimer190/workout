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

/** Wysyła subskrypcję do serwera (Edge Function zapisuje ją w bazie). */
export async function registerSubscription(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
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
}

/**
 * Prosi serwer o powiadomienie w chwili `endsAt`.
 *
 * Zwraca identyfikator harmonogramu (do późniejszego anulowania) albo `null`,
 * gdy powiadomienie nie zostało zaplanowane.
 */
export async function scheduleRestTimerPush(endsAt: number): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const delay = endsAt - Date.now();
  // Poza oknem, w którym Edge Function może czekać — powiadomienie
  // i tak nie zdążyłoby dotrzeć. Lepiej nie obiecywać niczego.
  if (delay <= 0 || delay > MAX_PUSH_DELAY_MS) return null;

  try {
    const { data, error } = await supabase.functions.invoke(PUSH_FUNCTION, {
      body: {
        action: 'schedule',
        endsAt,
        title: 'Czas!',
        body: 'Przerwa minęła — możesz zacząć kolejną serię.',
      },
    });
    if (error) return null;
    const id = (data as { id?: string } | null)?.id;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

/** Anuluje zaplanowane powiadomienie (gdy timer zatrzymano przed czasem). */
export async function cancelRestTimerPush(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.functions.invoke(PUSH_FUNCTION, {
      body: { action: 'cancel', id },
    });
  } catch {
    /* anulowanie jest najlepsze-effort — jeśli się nie uda, powiadomienie
       i tak dotrze, ale to tylko dokładność, nie awaria */
  }
}
