/**
 * Konfiguracja Web Push.
 *
 * Klucz VAPID publiczny jest z definicji publiczny (to identyfikator
 * nadawcy, nie sekret) — dlatego może być w bundlu. Klucz prywatny żyje
 * wyłącznie w sekretach Edge Function i nigdy nie trafia do przeglądarki.
 */

/** Publiczny klucz VAPID (P-256, base64url). */
export const VAPID_PUBLIC_KEY =
  'BBy2PK2tGo4jbEP0bfeuY1wFg4mPY7SB6HZizDIubw3BGjkJUvgSTLWYpTCwVHbjt-_AUxciEGY6n6z_q-s1IJk';

/** Adres nadawcy wymagany przez specyfikację Web Push. */
export const VAPID_SUBJECT = 'mailto:angelika_pawelek@wp.pl';

/** Nazwa Edge Function odpowiedzialnej za wysyłkę powiadomień. */
export const PUSH_FUNCTION = 'rest-timer-push';

/**
 * Najdłuższa przerwa, dla której powiadomienie systemowe zdąży się wysłać.
 *
 * Edge Function ma limit czasu ściany: 150 s (plan darmowy) albo 400 s
 * (plany płatne). Funkcja budzi się w tle, czeka do końca przerwy i dopiero
 * wtedy wysyła powiadomienie — poza tym oknem wiadomość nie dotrze.
 */
export const MAX_PUSH_DELAY_MS = 120_000;
