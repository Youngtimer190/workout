/**
 * Status połączenia z chmurą (Supabase).
 *
 * Jeden moduł, z którego korzystają wszystkie serwisy — dzięki temu aplikacja
 * wie, że chmura milcza, nawet jeśli błąd zgłosiło kilka serwisów naraz.
 *
 * Dlaczego to istnieje: gdy chmura przestaje odpowiadać, użytkownik powinien
 * widzieć jedno, jasne komunikat („działa na danych lokalnych”), a nie pusty
 * plan i surowe `TypeError: Failed to fetch` w konsoli.
 */

export type CloudState = 'unknown' | 'ok' | 'failed';

type Listener = (state: CloudState, error: string | null) => void;

let state: CloudState = 'unknown';
let lastError: string | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(state, lastError);
    } catch {
      /* słuchacz nie może wywrócić całej aplikacji */
    }
  }
}

function set(next: CloudState, error: string | null): void {
  if (state === next && lastError === error) return;
  state = next;
  lastError = error;
  emit();
}

/** Aktualny stan połączenia z chmurą. */
export function getCloudState(): CloudState {
  return state;
}

/** Ostatni błąd połączenia (do komunikatu w banerze). */
export function getCloudError(): string | null {
  return lastError;
}

/** Subskrypcja zmian stanu. Zwraca funkcję odsubskrybującą. */
export function subscribeCloud(listener: Listener): () => void {
  listeners.add(listener);
  // Natychmiastowy stan — przydatne przy pierwszym renderze.
  listener(state, lastError);
  return () => {
    listeners.delete(listener);
  };
}

/** Chmura odpowiedzia. */
export function markCloudOk(): void {
  set('ok', null);
}

/** Chmura nie odpowiedzia (albo zwróciła błąd sieci). */
export function markCloudFailed(error: string | null): void {
  set('failed', error);
}

/** Reset — np. po wylogowaniu. */
export function resetCloudStatus(): void {
  set('unknown', null);
}

/**
 * Czy błąd oznacza problem z POŁĄCZENIEM (a nie np. brak uprawnień)?
 *
 * Rozróżnienie ważne: brak uprawnień to błąd konfiguracji (trzeba go naprawić),
 * a problem z siecią to stan chwilowy (można ponowić).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  return (
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message) ||
    /load failed/i.test(message) ||
    /timeout/i.test(message) ||
    /signal timed out/i.test(message) ||
    /aborted/i.test(message) ||
    /fetch failed/i.test(message) ||
    /econnreset|etimedout|enotfound|econnrefused/i.test(message)
  );
}

/**
 * Loguje problem z chmurą w sposób zrozumiały dla developera:
 * • problem sieciowy → `warn` + informacja dla użytkownika,
 * • realny błąd (np. RLS) → `error` z oryginalnym komunikatem.
 */
export function logCloudIssue(scope: string, error: unknown): void {
  if (isNetworkError(error)) {
    console.warn(
      `[${scope}] Chmura nie odpowiada — dane z chmury są chwilowo niedostępne, ` +
      'aplikacja pracuje na danych lokalnych. Spróbuj ponownie za chwilę.'
    );
    return;
  }
  console.error(`[${scope}] Błąd chmury:`, error);
}
