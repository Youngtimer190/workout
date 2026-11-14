/**
 * Logika timera odpoczynku — czysta, bez React i bez DOM.
 *
 * Zasada: timer NIE liczy w dół. Trzymamy **znacznik czasu końca**
 * (`endsAt`) i przy każdym odczycie liczymy, ile zostało. Dzięki temu:
 *  • przeglądarka spowalnia timery w kartach w tle — ale `Date.now()`
 *    zawsze pokazuje prawdę, więc po powrocie licznik jest poprawny,
 *  • przeładowanie strony albo restart aplikacji nie gubi timera,
 *  • pauza to po prostu zapamiętanie pozostałego czasu.
 */

/** Gotowe czasy odpoczynku — najczęstsze przerwy między seriami. */
export const REST_PRESETS = [
  { label: '0:45', ms: 45_000 },
  { label: '1:00', ms: 60_000 },
  { label: '1:30', ms: 90_000 },
  { label: '2:00', ms: 120_000 },
  { label: '3:00', ms: 180_000 },
] as const;

/** Minimalny i maksymalny czas przerwy. */
export const MIN_REST_MS = 5_000;
export const MAX_REST_MS = 15 * 60_000;

/** Domyślny czas przerwy (1:30). */
export const DEFAULT_REST_MS = 90_000;

/**
 * Formatuje czas w milisekundach jako `m:ss` (albo `h:mm:ss` powyżej godziny).
 *
 * Cyfry są zawsze dwucyfrowe po dwukropku, żeby liczba nie „skakała”
 * przy odliczaniu (to wygląda tanio i dezorientuje).
 */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Zaokrągla do pełnych sekund (timer ma liczyć sekundy, nie milisekundy). */
export function roundToSecond(ms: number): number {
  return Math.round(ms / 1000) * 1000;
}

/** Ile milisekund zostało do `endsAt` (0, gdy termin już minął). */
export function remainingMs(endsAt: number | null, now: number): number {
  if (endsAt == null) return 0;
  return Math.max(0, endsAt - now);
}

/** Czy termin minął. */
export function isFinished(endsAt: number | null, now: number): boolean {
  return endsAt != null && now >= endsAt;
}

/**
 * Postęp odliczania w zakresie 0–1 (1 = start, 0 = koniec).
 *
 * Liczymy z **całkowitego czasu trwania**, a nie z „ile zostało w chwili
 * startu" — dzięki temu pierścień postępu jest zawsze spójny z liczbą,
 * nawet gdy użytkownik dodał 15 sekund w trakcie.
 */
export function progressRatio(
  startedAt: number | null,
  endsAt: number | null,
  now: number,
): number {
  if (startedAt == null || endsAt == null) return 0;
  const total = endsAt - startedAt;
  if (total <= 0) return 0;
  const left = remainingMs(endsAt, now);
  return Math.min(1, Math.max(0, left / total));
}

/**
 * Parsuje czas wpisany ręcznie.
 *
 * Akceptuje: `90` (90 sekund) oraz `1:30` (minuty:sekundy).
 * Przecinek dziesiętny też (`90,0`).
 * Zwraca `null`, gdy wejście jest błędne albo poza zakresem.
 */
export function parseDuration(input: string): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;

  const parts = raw.split(':');
  if (parts.length > 2) return null;

  const numbers = parts.map(p => Number(p.trim()));
  if (numbers.some(n => !Number.isFinite(n) || n < 0)) return null;

  const ms = numbers.length === 1
    ? numbers[0] * 1000
    : (numbers[0] * 60 + numbers[1]) * 1000;

  if (ms < MIN_REST_MS || ms > MAX_REST_MS) return null;
  return roundToSecond(ms);
}

/** Ogranicza czas do dozwolonego zakresu. */
export function clampDuration(ms: number): number {
  return Math.min(MAX_REST_MS, Math.max(MIN_REST_MS, roundToSecond(ms)));
}

/** Opis długości przerwy po polsku — np. „1 min 30 s”. */
export function describeDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} s`;
}
