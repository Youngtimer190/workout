-- ============================================================
-- FITPLANNER — Hardening bazy (limity sesji i blokad)
-- ============================================================
-- Wklej CAŁY ten plik do Supabase → SQL Editor i kliknij "Run".
-- Plik jest idempotentny — można go uruchomić więcej niż raz.
--
-- ── Po co to jest ────────────────────────────────────────────
-- 11.11.2026 projekt przestał odpowiadać: PostgREST przyjmował
-- połączenia, ale nie zwracał odpowiedzi (timeout), a po restarcie
-- zwracał 521. W `pg_stat_activity` były sesje w stanie
-- „idle in transaction” — trzymają blokadę i połączenie w puli.
--
-- Przyczyna mechanizmu:
--   1. Jedna sesja z otwartą transakcją trzyma blokadę na tabeli.
--   2. Zapytanie do tej tabeli czeka (ACCESS EXCLUSIVE koliduje
--      nawet z SELECT-em).
--   3. Każde zablokowane zapytanie zajmuje kolejne połączenie puli.
--   4. Pula się wyczerpuje → wszystkie zapytania stają w kolejce.
--
-- Domyślne ustawienie Supabase to `idle_in_transaction_session_timeout = 0`
-- (wyłączone) → wisząca transakcja może blokować pulę W NIESKOŃCZONOŚĆ.
-- Poniższe limity sprawiają, że każda sesja zamyka się sama.
--
-- ── Uwaga ─────────────────────────────────────────────────────
-- `ALTER DATABASE … SET` działa dla NOWYCH połączeń. Po zmianie
-- istniejące sesje zachowują stare limity — dlatego na końcu jest
-- instrukcja zamknięcia bieżących sesji (jednorazowo).
-- ============================================================


-- ────────────────────────────────────────────────────────────────
-- 1. Limity sesji
-- ────────────────────────────────────────────────────────────────
-- Transakcja bez zapytań nie może trwać w nieskończoność.
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '30s';

-- Zapytanie nie może wisieć w nieskończoność (np. przy blokadzie).
ALTER DATABASE postgres SET statement_timeout = '30s';

-- Czekanie na blokadę również ma limit — inaczej zapytanie czeka
-- w nieskończoność, zajmując połączenie puli.
ALTER DATABASE postgres SET lock_timeout = '10s';

-- Dla ról aplikacji też (dla pewności).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'ALTER ROLE authenticated SET idle_in_transaction_session_timeout = ''30s''';
    EXECUTE 'ALTER ROLE authenticated SET statement_timeout = ''30s''';
    EXECUTE 'ALTER ROLE authenticated SET lock_timeout = ''10s''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'ALTER ROLE anon SET idle_in_transaction_session_timeout = ''30s''';
    EXECUTE 'ALTER ROLE anon SET statement_timeout = ''30s''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'ALTER ROLE service_role SET idle_in_transaction_session_timeout = ''30s''';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 2. Funkcja pomocnicza: zamknij wiszące sesje
-- ────────────────────────────────────────────────────────────────
-- Uruchom w SQL Editor, gdy projekt „wisze” i trzeba szybko odblokować:
--   SELECT public.kill_stuck_sessions();
CREATE OR REPLACE FUNCTION public.kill_stuck_sessions()
RETURNS TABLE (pid integer, stan text, czas text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT a.pid,
         a.state::text,
         (now() - COALESCE(a.xact_start, a.query_start))::text
  FROM pg_catalog.pg_stat_activity a
  WHERE a.datname = current_database()
    AND a.pid <> pg_backend_pid()
    AND (
      -- sesje w transakcji, które nic nie robią
      a.state IN ('idle in transaction', 'idle in transaction (aborted)')
      -- zapytania czekające na blokadę lub długie
      OR (a.state = 'active'
          AND a.wait_event_type IN ('Lock', 'LWLock')
          AND now() - a.query_start > interval '30 seconds')
    )
    ORDER BY COALESCE(a.xact_start, a.query_start);
END;
$$;

REVOKE ALL ON FUNCTION public.kill_stuck_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kill_stuck_sessions() TO service_role;


-- ────────────────────────────────────────────────────────────────
-- 3. Diagnostyka (opcjonalne zapytania kontrolne)
-- ────────────────────────────────────────────────────────────────
-- Ile sesji i w jakim stanie:
--   SELECT state, count(*) FROM pg_stat_activity
--    WHERE datname = 'postgres' GROUP BY state ORDER BY 2 DESC;
--
-- Kto blokuje (łańcuch blokad):
--   SELECT a.pid, a.state, pg_blocking_pids(a.pid) AS blokowane_przez,
--          now() - a.query_start AS czas,
--          left(regexp_replace(a.query, '\s+', ' ', 'g'), 120) AS zapytanie
--     FROM pg_stat_activity a
--    WHERE datname = 'postgres'
--      AND (cardinality(pg_blocking_pids(a.pid)) > 0 OR a.state <> 'idle');
--
-- Oczekujące blokady (np. niecommitowany ALTER TABLE):
--   SELECT pid, locktype, relation::regclass AS tabela, mode, granted
--     FROM pg_locks WHERE NOT granted;
--
-- Czy limity obowiązują:
--   SELECT name, setting FROM pg_settings
--    WHERE name IN ('idle_in_transaction_session_timeout', 'statement_timeout', 'lock_timeout');


-- ────────────────────────────────────────────────────────────────
-- 4. Jednorazowe domknięcie bieżących sesji
-- ────────────────────────────────────────────────────────────────
-- Uruchom RAZ po zastosowaniu limitów (nowe połączenia dostaną nowe
-- wartości, a stare trzeba zamknąć):
--
--   SELECT pid, pg_terminate_backend(pid) AS zatrzymano
--     FROM pg_stat_activity
--    WHERE datname = 'postgres'
--      AND pid <> pg_backend_pid()
--      AND state IN ('idle in transaction', 'idle in transaction (aborted)');
--
-- Po tym projekt powinien odpowiadać normalnie. Gdyby nadal wisiał,
-- zrestartuj projekt albo napisz do Supabase Support
-- (referencja: mktkwysqcaafmjfkxqty).


-- ────────────────────────────────────────────────────────────────
-- 5. Weryfikacja (wklej i odczytaj wynik)
-- ────────────────────────────────────────────────────────────────
-- Wklej CAŁY blok poniżej do SQL Editor i kliknij „Run”. Trzy zapytania
-- zwrócą jeden wynik — wystarczy spojrzeć na niego.
--
--   1) limity sesji obowiązujące w NOWYCH połączeniach,
--   2) stan wszystkich sesji (czy któraś wisi w transakcji),
--   3) czy funkcja `kill_stuck_sessions()` została utworzona.
SELECT
  current_setting('idle_in_transaction_session_timeout') AS limit_transakcji,
  current_setting('statement_timeout')                  AS limit_zapytania,
  current_setting('lock_timeout')                       AS limit_blokady;

SELECT state, count(*) AS sesje,
       max(now() - COALESCE(xact_start, query_start)) AS najdluzsza
  FROM pg_stat_activity
 WHERE datname = 'postgres'
 GROUP BY state
 ORDER BY sesje DESC;

SELECT proname AS funkcja_hardeningu
  FROM pg_proc
 WHERE proname = 'kill_stuck_sessions';
--
-- ── Jak to odczytać ──────────────────────────────────────────────────
-- • „limit_transakcji" = 30s, „limit_zapytania" = 30s, „limit_blokady" = 10s
--   → limity są ustawione poprawnie.
-- • W tabeli sesji NIE MA wiersza „idle in transaction" (ani „aborted")
--   → nie ma wiszącej transakcji, która blokowałaby pulę.
-- • Wiersz „kill_stuck_sessions" jest obecny → funkcja jest gotowa.
--
-- Jeśli w tabeli sesji są stany „idle in transaction", uruchom raz jeszcze
-- zapytanie z sekcji 4 (zamknięcie sesji) — stare połączenia nie mają
-- jeszcze nowych limitów, bo `ALTER DATABASE … SET` działa dopiero dla
-- połączeń otwartych PO zmianie.
