-- ============================================================
-- FITPLANER — Udostępnianie dnia treningowego innemu użytkownikowi
-- ============================================================
-- Wklej CAŁY ten plik do Supabase → SQL Editor i kliknij "Run".
-- Plik jest idempotentny — można go wykonać więcej niż raz.
--
-- ── Jak to działa ───────────────────────────────────────────────
-- Nadawca wpisuje e-mail odbiorcy → powstaje wiersz w tabeli
-- `shared_workouts` ze statusem `pending`. Odbiorca widzi ten wiersz
-- TYLKO wtedy, gdy zaloguje się kontem o dokładnie takim adresie
-- e-mail. Dopasowanie odbywa się **wewnątrz RLS** — serwer nigdy nie
-- rozwiązuje `email → user_id`, więc aplikacja nie może (i nie musi)
-- ujawniać, czy dane konto w ogóle istnieje.
--
-- Klucz `service_role` NIE jest potrzebny — cały zapis idzie przez
-- klienta na kluczu `anon` z sesją użytkownika, pod ochroną RLS.
-- ============================================================


-- ────────────────────────────────────────────────────────────────
-- 0. Sprzątanie starych wersji funkcji
-- ────────────────────────────────────────────────────────────────
-- `CREATE OR REPLACE FUNCTION` NIE pozwala zmienić typu zwracanego
-- istniejącej funkcji — Postgres odpowiada błędem:
--   42P13: cannot change return type of existing function
-- W bazie może już istnieć starsza wersja `delete_user_account()`
-- z innym typem zwracanym, więc przed definicjami kasujemy stare
-- wersje i odtwarzamy je niżej w tym samym skrypcie.
--
-- Kolejność jest istotna:
--   1) polityki — trzymają zależność na używanych funkcjach,
--   2) triggery — wisi na funkcji, której nie da się usunąć,
--   3) funkcje.
-- Polityki i triggery odtwarzamy identycznie w sekcjach 4 i 6.
--
-- Cały skrypt jest jedną transakcją (SQL Editor), więc nikt nie
-- zobaczy chwilowo braku funkcji.
--
-- NIE usuwamy `handle_updated_at()` — jest wspólna dla wszystkich
-- tabel, a na niej wiszą triggery z innych skryptów. `CREATE OR REPLACE`
-- zachowuje OID funkcji, więc ich zależności zostają nienaruszone.

DO $$
DECLARE
  r record;
BEGIN
  -- 1) Polityki na shared_workouts (odtworzone w sekcji 6)
  FOR r IN
    SELECT c.relname AS tbl, pol.polname AS pol
    FROM pg_policy pol
    JOIN pg_class c     ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'shared_workouts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
  END LOOP;

  -- 2) Triggery zależące od usuwanych funkcji (odtworzone w sekcji 4)
  FOR r IN
    SELECT c.relname AS tbl, t.tgname AS trg
    FROM pg_trigger t
    JOIN pg_class c     ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
      AND t.tgfoid IN (
        SELECT p.oid
        FROM pg_proc p
        JOIN pg_namespace pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public'
          AND p.proname IN ('current_user_email', 'normalize_share', 'delete_user_account')
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trg, r.tbl);
  END LOOP;

  -- 3) Stare wersje funkcji — wszystkie przeciążenia i każdy typ zwracany.
  --    Sygnatura jest budowana z pg_get_function_identity_arguments()
  --    i jawnego schematu, więc NIE zależy od search_path — inaczej
  --    regprocedure pominąłby schemat dla funkcji widocznych w ścieżce
  --    wyszukiwania, a DROP trafiłby nie tam.
  FOR r IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname,
                  pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('current_user_email', 'normalize_share', 'delete_user_account')
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig;
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 1. Autorytatywny odczyt adresu e-mail zalogowanego użytkownika
-- ────────────────────────────────────────────────────────────────
-- Claim `email` w JWT to tylko SNAPSHOT — po zmianie adresu w profilu
-- stare tokeny (do ~1 h) nadal go zawierają, a Custom Access Token
-- Hook może go w ogóle usunąć. Dlatego czytamy `auth.users.email`,
-- czyli źródło prawdy.
--
-- Funkcja jest SECURITY DEFINER, bo użytkownik nie ma prawa czytać
-- tabeli `auth.users`. `SET search_path = ''` blokuje podszywanie się
-- pod inne schematy (tzw. search_path injection).
--
-- Wzorzec `(select public.current_user_email())` w politykach RLS jest
-- istotny: Postgres cache'uje wynik funkcji STABLE w obrębie zapytania
-- (tzw. initPlan), zamiast wywoływać ją osobno dla każdego wiersza.
--
-- REVOKE ALL ... FROM PUBLIC jest konieczne — domyślnie funkcja jest
-- wykonywalna przez wszystkich, w tym przez rolę `anon`.

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT lower(btrim(u.email))
  FROM auth.users u
  WHERE u.id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.current_user_email() TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 2. Funkcja aktualizująca updated_at (wspólna dla wszystkich tabel)
-- ────────────────────────────────────────────────────────────────
-- Identyczna jak ta z SUPABASE_SETUP.md — tu powtarzamy ją, żeby ten
-- plik działał samodzielnie.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ────────────────────────────────────────────────────────────────
-- 3. Tabela `shared_workouts`
-- ────────────────────────────────────────────────────────────────
-- `day_data` to migawka (snapshot) dnia treningowego w formacie JSONB:
--   { "exercises": [ { "name": ..., "setLogs": [...] }, ... ] }
-- Prywatne notatki (`note`) są usuwane po stronie klienta PRZED
-- wysłaniem — baza nie umie ich odfiltrować.

CREATE TABLE IF NOT EXISTS public.shared_workouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email        TEXT NOT NULL,
  owner_name         TEXT,
  recipient_email    TEXT NOT NULL,
  week_key           TEXT NOT NULL,
  day_index          INTEGER NOT NULL,
  day_name           TEXT,
  day_data           JSONB NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending',
  accepted_at        TIMESTAMPTZ,
  accepted_week_key  TEXT,
  accepted_day_index INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Dzień tygodnia: 0 = Poniedziałek ... 6 = Niedziela
  CONSTRAINT shared_workouts_day_index_check
    CHECK (day_index BETWEEN 0 AND 6),

  -- Dozwolone statusy — nic innego nie może zostać zapisane
  CONSTRAINT shared_workouts_status_check
    CHECK (status IN ('pending', 'accepted', 'declined')),

  -- E-mail odbiorcy musi być znormalizowany (małe litery + bez spacji).
  -- Gwarancję normalizacji daje trigger poniżej — bez tego udostępnienie
  -- zapisane jako "Jan.Kowalski@Example.com" nigdy nie zostałoby
  -- dopasowane przez żadną politykę (cichy, wieczny „wysłano").
  CONSTRAINT shared_workouts_recipient_email_normalized_check
    CHECK (recipient_email = lower(btrim(recipient_email))),

  -- Podstawowa walidacja formatu (nie sprawdza czy konto istnieje!)
  CONSTRAINT shared_workouts_recipient_email_format_check
    CHECK (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  CONSTRAINT shared_workouts_owner_email_normalized_check
    CHECK (owner_email = lower(btrim(owner_email))),

  -- Kształt migawki: obiekt z tablicą `exercises`, max 100 pozycji,
  -- max 256 KB. `CASE` (a nie `AND`) jest tu celowy — Postgres nie
  -- gwarantuje kolejności ewaluacji `AND`, więc `jsonb_array_length()`
  -- mogłoby rzucić wyjątek zamiast zwrócić FALSE dla złego typu.
  CONSTRAINT shared_workouts_day_data_check
    CHECK (
      jsonb_typeof(day_data) = 'object'
      AND octet_length(day_data::text) < 262144
      AND CASE
            WHEN jsonb_typeof(day_data -> 'exercises') = 'array'
              THEN jsonb_array_length(day_data -> 'exercises') <= 100
            ELSE false
          END
    ),

  -- Tydzień w formacie "2026-W43"
  CONSTRAINT shared_workouts_week_key_check
    CHECK (week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  CONSTRAINT shared_workouts_accepted_week_key_check
    CHECK (accepted_week_key IS NULL OR accepted_week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  CONSTRAINT shared_workouts_accepted_day_index_check
    CHECK (accepted_day_index IS NULL OR accepted_day_index BETWEEN 0 AND 6),

  -- Spójność pól akceptacji: status `accepted` wymaga kompletu danych
  CONSTRAINT shared_workouts_accepted_fields_check
    CHECK (
      status <> 'accepted'
      OR (
        accepted_at IS NOT NULL
        AND accepted_week_key IS NOT NULL
        AND accepted_day_index IS NOT NULL
      )
    )
);

-- Indeksy — polityka SELECT filtruje po e-mailu odbiorcy, bez indeksu
-- to sekwencyjny skan przy każdym odczycie listy udostępnień.
CREATE INDEX IF NOT EXISTS idx_shared_workouts_recipient_email
  ON public.shared_workouts(recipient_email);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_owner_id
  ON public.shared_workouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_pending_recipient
  ON public.shared_workouts(recipient_email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_shared_workouts_owner_status
  ON public.shared_workouts(owner_id, status);


-- ────────────────────────────────────────────────────────────────
-- 4. Trigger normalizujący (BEFORE INSERT)
-- ────────────────────────────────────────────────────────────────
-- Normalizacja e-maili odbywa się W BAZIE, a nie w kliencie — klient
-- nie może o niej zapomnieć, a nadawca nie może podrzucić własnego
-- `owner_id` / `owner_email` / `owner_name` ani utworzyć wiersza
-- od razu zaakceptowanego.
--
-- SECURITY DEFINER pozwala odczytać `auth.users` (dane nadawcy).
-- `SET search_path = ''` — patrz sekcja 1.

CREATE OR REPLACE FUNCTION public.normalize_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid       UUID := (SELECT auth.uid());
  mail      TEXT;
  full_name TEXT;
BEGIN
  IF uid IS NULL THEN
    -- Brak sesji — np. odtwarzanie backupu w SQL Editorze. Wtedy owner_id
    -- musi już być podany przez plik backupowy. Prawo wstawienia sprawdza
    -- i tak polityka RLS INSERT (`owner_id = auth.uid()`), więc ten tryb
    -- nie jest obejściem RLS.
    IF NEW.owner_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;
    RETURN NEW;
  END IF;

  SELECT lower(btrim(u.email)), btrim(COALESCE(u.raw_user_meta_data ->> 'full_name', ''))
    INTO mail, full_name
  FROM auth.users u
  WHERE u.id = uid;

  -- Nadawca to zawsze zalogowany użytkownik wywołujący INSERT.
  NEW.owner_id           := uid;
  NEW.owner_email        := mail;
  NEW.owner_name         := NULLIF(full_name, '');

  -- Odbiorca normalizowany tak samo jak e-mail w auth.users
  NEW.recipient_email    := lower(btrim(COALESCE(NEW.recipient_email, '')));

  -- Nowe udostępnienie ZAWSZE startuje jako `pending`
  NEW.status             := 'pending';
  NEW.accepted_at        := NULL;
  NEW.accepted_week_key  := NULL;
  NEW.accepted_day_index := NULL;
  NEW.created_at         := now();
  NEW.updated_at         := now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_share() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.normalize_share() TO authenticated;

DROP TRIGGER IF EXISTS trg_normalize_share ON public.shared_workouts;
CREATE TRIGGER trg_normalize_share
  BEFORE INSERT ON public.shared_workouts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_share();

-- Aktualizacja `updated_at` przy każdej zmianie wiersza
DROP TRIGGER IF EXISTS set_updated_at_shared_workouts ON public.shared_workouts;
CREATE TRIGGER set_updated_at_shared_workouts
  BEFORE UPDATE ON public.shared_workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ────────────────────────────────────────────────────────────────
-- 5. Uprawnienia (GRANT / REVOKE)
-- ────────────────────────────────────────────────────────────────
-- Supabase domyślnie nadaje rolom `anon` i `authenticated` PEŁNY
-- GRANT na tabele w schemacie `public` — w tym `TRUNCATE`, które NIE
-- podlega RLS (operacje na całej tabeli są wyłączone z row security).
-- Bez poniższych REVOKE zalogowany użytkownik mógłby wyczyścić
-- tabelę udostępnień, a klucz `anon` mógłby czytać jej zawartość.
--
-- `GRANT UPDATE (kolumna, ...)` ogranicza do konkretnych kolumn.
-- UWAGA: to ograniczenie jest na poziomie ROLI, a nie polityki —
-- nadawca i odbiorca dzielą uprawnienia do kolumn, więc odbiorca
-- dostaje `UPDATE` tylko na tych czterech kolumnach, a nie na
-- `day_data` / `owner_id` / `recipient_email`.
--
-- `PUBLIC` obejmuje wszystkie role (w tym `anon`) — odbieramy mu
-- uprawnienia na poziomie tabeli, a potem nadajemy jawnie to, co
-- jest potrzebne.

REVOKE ALL ON TABLE public.shared_workouts FROM PUBLIC;
REVOKE ALL ON TABLE public.shared_workouts FROM anon;
REVOKE ALL ON TABLE public.shared_workouts FROM authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE public.shared_workouts TO authenticated;
GRANT UPDATE (status, accepted_at, accepted_week_key, accepted_day_index, updated_at)
  ON TABLE public.shared_workouts TO authenticated;

-- Skrypt backupowy (`BACKUP NODE/backup.mjs`) czyta tabele kluczem
-- `service_role`. Supabase nadaje mu prawa domyślnie, ale `REVOKE ... FROM
-- PUBLIC` kasuje też prawa nadane „przez PUBLIC" — nadajmy mu je jawnie,
-- żeby zrzut bazy na pewno działał po migracji.
GRANT ALL ON TABLE public.shared_workouts TO service_role;


-- ────────────────────────────────────────────────────────────────
-- 6. Row Level Security — polityki dostępu
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_workouts_select" ON public.shared_workouts;
DROP POLICY IF EXISTS "shared_workouts_insert" ON public.shared_workouts;
DROP POLICY IF EXISTS "shared_workouts_update" ON public.shared_workouts;
DROP POLICY IF EXISTS "shared_workouts_delete" ON public.shared_workouts;

-- SELECT — nadawca widzi swoje wiersze, odbiorca widzi wiersze
-- zaadresowane na jego e-mail. Inni użytkownicy nie widzą nic.
CREATE POLICY "shared_workouts_select" ON public.shared_workouts
  FOR SELECT
  USING (
    owner_id = (SELECT auth.uid())
    OR recipient_email = (SELECT public.current_user_email())
  );

-- INSERT — tylko własne udostępnienia (owner_id ustawia trigger)
CREATE POLICY "shared_workouts_insert" ON public.shared_workouts
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- UPDATE — odbiorca może TYLKO odpowiedzieć na oczekujące udostępnienie:
--   USING     → stary wiersz musi być `pending` i adresowany do mnie
--                (po zmianie statusu wiersz zamarza — nie da się
--                zaakceptować drugi raz ani cofnąć własnej decyzji)
--   WITH CHECK → po zmianie status musi być `accepted`/`declined`
--                i nadal muszę być odbiorcą (nie da się przekierować
--                udostępnienia podmianą `recipient_email`)
CREATE POLICY "shared_workouts_update" ON public.shared_workouts
  FOR UPDATE
  USING (
    recipient_email = (SELECT public.current_user_email())
    AND status = 'pending'
  )
  WITH CHECK (
    recipient_email = (SELECT public.current_user_email())
    AND status IN ('accepted', 'declined')
  );

-- DELETE — nadawca może anulować oczekujące udostępnienie,
-- ale nie może skasować historii zaakceptowanych/odrzuconych.
CREATE POLICY "shared_workouts_delete" ON public.shared_workouts
  FOR DELETE
  USING (
    owner_id = (SELECT auth.uid())
    AND status = 'pending'
  );


-- ────────────────────────────────────────────────────────────────
-- 7. Rozszerzone usuwanie konta
-- ────────────────────────────────────────────────────────────────
-- Funkcja kasuje dane aplikacji ORAZ samo konto w `auth.users`.
-- Wcześniejsza wersja usuwała tylko dane z dwóch tabel, a konto
-- zostawało w `auth.users` (patrz SUPABASE_SETUP.md §5).
--
-- Kasujemy też udostępnienia, w których użytkownik jest ODBIORCĄ
-- (dopasowanie po e-mailu) — inaczej po usunięciu konta pozostałyby
-- w bazie i czekałyby na nową osobę z tym samym adresem.
--
-- `SET search_path = ''` + jawne kwalifikowanie `auth.*` / `public.*`
-- chroni przed search_path injection.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid  UUID := (SELECT auth.uid());
  mail TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(btrim(u.email)) INTO mail
  FROM auth.users u
  WHERE u.id = uid;

  -- Dane z tabel aplikacji
  DELETE FROM public.week_plans       WHERE user_id = uid;
  DELETE FROM public.custom_exercises WHERE user_id = uid;

  -- Udostępnienia: nadawca ORAZ odbiorca
  DELETE FROM public.shared_workouts
  WHERE owner_id = uid
     OR (mail IS NOT NULL AND recipient_email = mail);

  -- Konto, sesje i tożsamości (kaskady z auth.users zadziałają
  -- automatycznie, ale usuwamy jawnie — bezpieczniej i idempotentnie)
  DELETE FROM auth.sessions   WHERE user_id = uid;
  DELETE FROM auth.identities WHERE user_id = uid;
  DELETE FROM auth.users      WHERE id = uid;
END;
$$;

ALTER FUNCTION public.delete_user_account() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 8. Hardening istniejących tabel (week_plans, custom_exercises)
-- ────────────────────────────────────────────────────────────────
-- Identyczny problem co wyżej: `anon` i `authenticated` mają domyślnie
-- PEŁNE uprawnienia do tabel w `public`, w tym `TRUNCATE`, które omija
-- RLS. Aplikacja nie korzysta z `anon` do odczytu tych tabel (dane
-- są pobierane wyłącznie po zalogowaniu), więc możemy bezpiecznie
-- odebrać nadmiarowe uprawnienia.
--
-- `upsert` (week_plans / custom_exercises) potrzebuje SELECT + INSERT
-- + UPDATE — wszystko pozostaje nadane.

REVOKE ALL ON TABLE public.week_plans FROM PUBLIC;
REVOKE ALL ON TABLE public.week_plans FROM anon;
REVOKE ALL ON TABLE public.week_plans FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.week_plans TO authenticated;
GRANT ALL ON TABLE public.week_plans TO service_role;

REVOKE ALL ON TABLE public.custom_exercises FROM PUBLIC;
REVOKE ALL ON TABLE public.custom_exercises FROM anon;
REVOKE ALL ON TABLE public.custom_exercises FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.custom_exercises TO authenticated;
GRANT ALL ON TABLE public.custom_exercises TO service_role;


-- ────────────────────────────────────────────────────────────────
-- 9. Weryfikacja (opcjonalne zapytania kontrolne)
-- ────────────────────────────────────────────────────────────────
-- SELECT id, owner_email, recipient_email, status, created_at
--   FROM public.shared_workouts ORDER BY created_at DESC LIMIT 20;
--
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--  WHERE tablename = 'shared_workouts';
--
-- SELECT has_table_privilege('anon', 'public.shared_workouts', 'SELECT')         AS anon_select,
--        has_table_privilege('anon', 'public.shared_workouts', 'TRUNCATE')       AS anon_truncate,
--        has_table_privilege('authenticated', 'public.shared_workouts', 'SELECT') AS auth_select,
--        has_column_privilege('authenticated', 'public.shared_workouts', 'day_data', 'UPDATE') AS auth_update_day_data;
--
-- Po zmianach DDL Supabase przeładowuje cache PostgREST automatycznie.
-- Jeśli aplikacja nagle zgłosi "permission denied", wykonaj ręcznie:
--   NOTIFY pgrst, 'reload schema';
