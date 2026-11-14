/**
 * Czytelne komunikaty o błędach — dla użytkownika, nie dla developera.
 *
 * Surowe komunikaty Supabase (np. „Expected 3 parts in JWT; got 1”,
 * „Failed to fetch”, „row-level security violation”) są nieczytelne i nie
 * mówią użytkownikowi, co ma zrobić. Ten moduł tłumaczy najczęstsze
 * błędy na polskie, konkretne komunikaty; wszystko nieznane dostaje
 * komunikat zastępczy (a nie śmieć techniczny).
 *
 * Oryginalny komunikat zostaje w konsoli — tam jest potrzebny
 * diagnostycznie (patrz `logCloudIssue`).
 */

/** Wyjątki, które oznaczają problem z sesją (trzeba się zalogować ponownie). */
const SESSION_PATTERNS =
  /expected \d+ parts in jwt|invalid jwt|jwt expired|invalid token|token is expired|invalid claim|missing sub claim/i;

/** Wyjątki oznaczające problem z siecią. */
const NETWORK_PATTERNS =
  /failed to fetch|networkerror|load failed|timeout|timed out|aborted|fetch failed|econnreset|etimedout|enotfound|econnrefused|err_internet_disconnected/i;

interface Rule {
  test: RegExp;
  message: string;
}

/**
 * Kolejność ma znaczenie — pierwsza pasująca reguła wygrywa.
 * Bardziej szczegółowe wzorce (sesja, sieć) idą przed ogólnymi.
 */
const RULES: Rule[] = [
  /* ── Sesja ─────────────────────────────────────────────────────────────── */
  {
    test: SESSION_PATTERNS,
    message: 'Sesja wygasła lub jest uszkodzona. Wyloguj się i zaloguj ponownie.',
  },
  {
    test: /invalid login credentials/i,
    message: 'Nieprawidłowy email lub hasło.',
  },
  {
    test: /email not confirmed/i,
    message: 'Najpierw potwierdź adres email — sprawdź swoją skrzynkę pocztową.',
  },
  {
    test: /already registered|already been registered/i,
    message: 'Ten email jest już zarejestrowany.',
  },
  {
    test: /user not found/i,
    message: 'Nie znaleźliśmy użytkownika o podanym emailu.',
  },
  {
    test: /password should be at least|password.*too short/i,
    message: 'Hasło musi mieć co najmniej 6 znaków.',
  },
  {
    test: /new password should be different/i,
    message: 'Nowe hasło musi różnić się od poprzedniego.',
  },
  {
    test: /rate limit|too many requests|429/i,
    message: 'Zbyt wiele prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.',
  },

  /* ── Sieć ──────────────────────────────────────────────────────────────── */
  {
    test: NETWORK_PATTERNS,
    message: 'Brak połączenia z internetem. Twoje dane zapisują się lokalnie — spróbuj ponownie, gdy wróci sieć.',
  },

  /* ── Baza danych / uprawnienia ─────────────────────────────────────────── */
  {
    test: /row-level security|42501|permission denied|not authorized/i,
    message: 'Brak uprawnień do tej operacji.',
  },
  {
    test: /duplicate key|23505/i,
    message: 'Taka pozycja już istnieje.',
  },
  {
    test: /column .* does not exist|42P01|relation .* does not exist/i,
    message: 'Baza danych wymaga aktualizacji.',
  },
  {
    test: /violates .* constraint|23\d\d/i,
    message: 'Operacja narusza reguły bazy danych.',
  },
  {
    test: /not found|404/i,
    message: 'Nie znaleziono szukanych danych.',
  },
  {
    test: /cors|blocked by|certificate/i,
    message: 'Połączenie z serwerem zostało zablokowane. Sprawdź połączenie internetowe.',
  },
];

/**
 * Wyciąga tekst błędu z różnych kształtów, w jakich wraca z Supabase:
 * `Error`, `{ message }`, `{ error: { message } }`, czysty string.
 */
export function extractMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message || error.name;

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;

    if (typeof obj.message === 'string' && obj.message) return obj.message;

    if (obj.error && typeof obj.error === 'object') {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === 'string' && inner.message) return inner.message;
    }

    if (typeof obj.error === 'string' && obj.error) return obj.error;

    if (typeof obj.details === 'string' && obj.details) return obj.details;

    if (typeof obj.hint === 'string' && obj.hint) return obj.hint;
  }

  return '';
}

/**
 * Zamienia błąd na komunikat dla użytkownika.
 *
 * `fallback` to tekst bezpieczny na wypadek, gdyby błędu nie dało się
 * rozpoznać — nigdy nie pokazujemy wtedy surowego komunikatu serwera.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  const raw = extractMessage(error);
  if (!raw) return fallback;

  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }

  return fallback;
}

/** Czy błąd oznacza, że sesja wygasła (trzeba zalogować się ponownie)? */
export function isSessionError(error: unknown): boolean {
  return SESSION_PATTERNS.test(extractMessage(error));
}

/** Czy błąd oznacza problem z siecią (a nie z logiką aplikacji)? */
export function isConnectivityError(error: unknown): boolean {
  return NETWORK_PATTERNS.test(extractMessage(error));
}
