#!/usr/bin/env node
/**
 * Supabase Database Backup Script
 * Uruchom: node backup.mjs
 * Generuje plik backup_YYYY-MM-DD_HH-MM-SS.sql z pełnym dumpem bazy danych
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ─── Wczytaj zmienne środowiskowe z .env.local ─────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ Brak pliku .env.local');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};

  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }

  return env;
}

const env = loadEnv();

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Brak VITE_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local');
  process.exit(1);
}

// ─── Klient Supabase z uprawnieniami admin ────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Helper do escape'owania SQL ──────────────────────────────────────────────
function escapeValue(value) {
  if (value === null) return 'NULL';
  if (value === undefined) return 'NULL';

  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (typeof value === 'object') {
    // JSONB / JSON
    const json = JSON.stringify(value);
    return `'${json.replace(/'/g, "''")}'::jsonb`;
  }

  // String
  return `'${String(value).replace(/'/g, "''")}'`;
}

// ─── Generowanie timestamp ───────────────────────────────────────────────────
function getTimestamp() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

// ─── Pobierz dane z tabel ──────────────────────────────────────────────────────
async function fetchTableData(tableName) {
  console.log(`  📥 Pobieram dane z ${tableName}...`);

  // Używamy service_role więc omijamy RLS
  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`  ⚠️ Błąd pobierania ${tableName}:`, error.message);
    return [];
  }

  console.log(`  ✅ ${tableName}: ${data?.length || 0} rekordów`);
  return data || [];
}

// ─── Generuj INSERT statements ─────────────────────────────────────────────────
function generateInsertStatements(tableName, columns, rows) {
  if (!rows || rows.length === 0) return '';

  const lines = [];

  for (const row of rows) {
    const values = columns.map(col => escapeValue(row[col]));
    lines.push(`INSERT INTO public.${tableName} (${columns.join(', ')})\nVALUES (${values.join(', ')});`);
  }

  return lines.join('\n\n');
}

// ─── Główna funkcja ────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 Rozpoczynam backup bazy danych Supabase...\n');

  // Pobierz dane z tabel
  const weekPlans = await fetchTableData('week_plans');
  const customExercises = await fetchTableData('custom_exercises');
  const sharedWorkouts = await fetchTableData('shared_workouts');

  // Nazwy kolumn (zgodne ze schematem)
  const weekPlansColumns = ['id', 'user_id', 'week_key', 'days_data', 'created_at', 'updated_at'];
  const customExercisesColumns = ['id', 'user_id', 'exercise_id', 'exercise_data', 'created_at', 'updated_at'];
  const sharedWorkoutsColumns = [
    'id', 'owner_id', 'owner_email', 'owner_name', 'recipient_email',
    'week_key', 'day_index', 'day_name', 'day_data', 'status',
    'accepted_at', 'accepted_week_key', 'accepted_day_index',
    'created_at', 'updated_at',
  ];

  // Generuj SQL
  const timestamp = getTimestamp();
  const filename = `backup_${timestamp}.sql`;

  const sql = `-- ============================================================
-- FITPLANER — Database Backup
-- Wygenerowano: ${new Date().toLocaleString('pl-PL')}
-- Projekt: ${SUPABASE_URL}
-- ============================================================
-- Aby przywrócić bazę: wklej CAŁY ten plik do Supabase SQL Editor
-- i kliknij "Run"
--
-- UWAGA: week_plans i shared_workouts trzymają klucz obce do auth.users
-- (user_id / owner_id). Odtwarzanie powiodzie się tylko wtedy, gdy konta
-- tych użytkowników już istnieją w bazie — inaczej naruszenie klucza
-- obcego zatrzyma skrypt.
-- ============================================================

-- ── Wyczyść istniejące dane (opcjonalnie) ────────────────────────────
-- UWAGA: Odkomentuj poniższe linie jeśli chcesz usunąć wszystkie dane
-- TRUNCATE TABLE public.week_plans CASCADE;
-- TRUNCATE TABLE public.custom_exercises CASCADE;
-- TRUNCATE TABLE public.shared_workouts CASCADE;

-- ── Usuń duplikaty (jeśli INSERT ma konflikt) ───────────────────────────
-- Jeśli przywracasz backup na istniejącą bazę, użyj ON CONFLICT DO NOTHING

-- ============================================================
-- TABELA: week_plans (${weekPlans.length} rekordów)
-- ============================================================

${weekPlans.length > 0 ? generateInsertStatements('week_plans', weekPlansColumns, weekPlans) : '-- Brak danych'}

-- ============================================================
-- TABELA: custom_exercises (${customExercises.length} rekordów)
-- ============================================================

${customExercises.length > 0 ? generateInsertStatements('custom_exercises', customExercisesColumns, customExercises) : '-- Brak danych'}

-- ============================================================
-- TABELA: shared_workouts (${sharedWorkouts.length} rekordów)
-- ============================================================

${sharedWorkouts.length > 0 ? generateInsertStatements('shared_workouts', sharedWorkoutsColumns, sharedWorkouts) : '-- Brak danych'}

-- ============================================================
-- SCHEMA DEFINITION (dla odniesienia)
-- ============================================================
-- Poniższe definicje są zakomentowane ponieważ tabele powinny już istnieć.
-- Jeśli odtwarzasz bazę od zera, odkomentuj poniższy kod:

/*
-- ── Sprzątanie starych wersji funkcji ───────────────────────
-- CREATE OR REPLACE FUNCTION nie pozwala zmienić typu zwracanego
-- istniejącej funkcji (błąd 42P13). Stara delete_user_account()
-- może mieć inny typ zwracany, więc kasujemy ją przed definicją.
-- Polityki i triggery (zależące na funkcjach) odtwarzamy niżej.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, pol.polname AS pol
    FROM pg_policy pol
    JOIN pg_class c     ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'shared_workouts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
  END LOOP;

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

-- Tabela planów tygodniowych
CREATE TABLE IF NOT EXISTS public.week_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key    TEXT NOT NULL,
  days_data   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_key)
);

-- Tabela własnych ćwiczeń
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL,
  exercise_data JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Trigger do aktualizacji updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_week_plans ON public.week_plans;
CREATE TRIGGER set_updated_at_week_plans
  BEFORE UPDATE ON public.week_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_custom_exercises ON public.custom_exercises;
CREATE TRIGGER set_updated_at_custom_exercises
  BEFORE UPDATE ON public.custom_exercises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Tabela udostępnionych dni treningowych ────────────────────
-- Migracja jest zgodna z SUPABASE_SETUP_SHARES.sql — ograniczenia
-- (CHECK) muszą być identyczne, inaczej odtworzona baza byłaby
-- bardziej liberalna niż produkcyjna.
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

  CONSTRAINT shared_workouts_day_index_check
    CHECK (day_index BETWEEN 0 AND 6),
  CONSTRAINT shared_workouts_status_check
    CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT shared_workouts_recipient_email_normalized_check
    CHECK (recipient_email = lower(btrim(recipient_email))),
  CONSTRAINT shared_workouts_recipient_email_format_check
    CHECK (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT shared_workouts_owner_email_normalized_check
    CHECK (owner_email = lower(btrim(owner_email))),
  -- CASE (a nie AND) — Postgres nie gwarantuje kolejności ewaluacji AND,
  -- więc jsonb_array_length() mogłoby rzucić wyjątek zamiast zwrócić FALSE.
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
  CONSTRAINT shared_workouts_week_key_check
    CHECK (week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  CONSTRAINT shared_workouts_accepted_week_key_check
    CHECK (accepted_week_key IS NULL OR accepted_week_key ~ '^[0-9]{4}-W[0-9]{2}$'),
  CONSTRAINT shared_workouts_accepted_day_index_check
    CHECK (accepted_day_index IS NULL OR accepted_day_index BETWEEN 0 AND 6),
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

-- Indeksy — polityka SELECT filtruje po e-mailu odbiorcy
CREATE INDEX IF NOT EXISTS idx_shared_workouts_recipient_email
  ON public.shared_workouts(recipient_email);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_owner_id
  ON public.shared_workouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_pending_recipient
  ON public.shared_workouts(recipient_email)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_shared_workouts_owner_status
  ON public.shared_workouts(owner_id, status);

-- ── Funkcja odczytu e-maila zalogowanego użytkownika ──────────
-- SECURITY DEFINER, bo użytkownik nie ma prawa czytać auth.users.
-- Wzorzec (select public.current_user_email()) cache'uje wynik w
-- obrębie zapytania (initPlan) zamiast wywoływać funkcję per wiersz.
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

-- ── Trigger normalizujący udostępnienie (BEFORE INSERT) ────────
-- Ustawia owner_id / owner_email / owner_name i wymusza status
-- 'pending'. Bez tego triggera INSERT z aplikacji (który nie wysyła
-- owner_id) wyrzuciłby błąd NOT NULL.
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
    -- i tak polityka RLS INSERT (owner_id = auth.uid()), więc ten tryb
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

  NEW.owner_id           := uid;
  NEW.owner_email        := mail;
  NEW.owner_name         := NULLIF(full_name, '');
  NEW.recipient_email    := lower(btrim(COALESCE(NEW.recipient_email, '')));
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

DROP TRIGGER IF EXISTS set_updated_at_shared_workouts ON public.shared_workouts;
CREATE TRIGGER set_updated_at_shared_workouts
  BEFORE UPDATE ON public.shared_workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
ALTER TABLE public.week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "week_plans_select" ON public.week_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "week_plans_insert" ON public.week_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "week_plans_update" ON public.week_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "week_plans_delete" ON public.week_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "custom_exercises_select" ON public.custom_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "custom_exercises_insert" ON public.custom_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "custom_exercises_update" ON public.custom_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "custom_exercises_delete" ON public.custom_exercises FOR DELETE USING (auth.uid() = user_id);

-- Nadawca widzi swoje, odbiorca widi wiersze zaadresowane na jego e-mail.
-- Dopasowanie po e-mailu WEWNĄTRZ RLS — serwer nigdy nie rozwiązuje
-- email → user_id, więc aplikacja nie może ujawnić, czy konto istnieje.
CREATE POLICY "shared_workouts_select" ON public.shared_workouts
  FOR SELECT
  USING (
    owner_id = (SELECT auth.uid())
    OR recipient_email = (SELECT public.current_user_email())
  );

CREATE POLICY "shared_workouts_insert" ON public.shared_workouts
  FOR INSERT
  WITH CHECK (owner_id = (SELECT auth.uid()));

-- Wiersz zamarza po pierwszej odpowiedzi (USING ... status='pending').
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

CREATE POLICY "shared_workouts_delete" ON public.shared_workouts
  FOR DELETE
  USING (
    owner_id = (SELECT auth.uid())
    AND status = 'pending'
  );

-- ── Uprawnienia ─────────────────────────────────────────────────
-- Supabase domyślnie nadaje rolom anon / authenticated PEŁNY GRANT
-- na tabele w schemacie public — w tym TRUNCATE, które NIE podlega RLS.
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

REVOKE ALL ON TABLE public.shared_workouts FROM PUBLIC;
REVOKE ALL ON TABLE public.shared_workouts FROM anon;
REVOKE ALL ON TABLE public.shared_workouts FROM authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.shared_workouts TO authenticated;
-- Ograniczenie jest na poziomie ROLI: odbiorca nie dosięgnie day_data,
-- owner_id ani recipient_email.
GRANT UPDATE (status, accepted_at, accepted_week_key, accepted_day_index, updated_at)
  ON TABLE public.shared_workouts TO authenticated;
-- Skrypt backupowy czyta tę tabelę kluczem service_role — nadajmy mu
-- prawa jawnie, bo REVOKE ... FROM PUBLIC kasuje też prawa domyślne
-- nadane „przez PUBLIC".
GRANT ALL ON TABLE public.shared_workouts TO service_role;

-- ── Usuwanie konta (kasuje też udostępnienia + samo konto) ──────
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

  DELETE FROM public.week_plans       WHERE user_id = uid;
  DELETE FROM public.custom_exercises WHERE user_id = uid;

  -- Nadawca ORAZ odbiorca
  DELETE FROM public.shared_workouts
  WHERE owner_id = uid
     OR (mail IS NOT NULL AND recipient_email = mail);

  DELETE FROM auth.sessions   WHERE user_id = uid;
  DELETE FROM auth.identities WHERE user_id = uid;
  DELETE FROM auth.users      WHERE id = uid;
END;
$$;

ALTER FUNCTION public.delete_user_account() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_week_plans_user_id ON public.week_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_week_plans_week_key ON public.week_plans(user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);
*/

-- ============================================================
-- KONIEC BACKUP
-- ============================================================
`;

  // Zapisz plik
  writeFileSync(resolve(process.cwd(), filename), sql, 'utf-8');

  console.log(`\n✅ Backup zapisany do: ${filename}`);
  console.log(`📊 Podsumowanie:`);
  console.log(`   - week_plans: ${weekPlans.length} rekordów`);
  console.log(`   - custom_exercises: ${customExercises.length} rekordów`);
  console.log(`   - shared_workouts: ${sharedWorkouts.length} rekordów`);
  console.log(`\n📋 Aby przywrócić bazę:`);
  console.log(`   1. Otwórz Supabase Dashboard → SQL Editor`);
  console.log(`   2. Wklej zawartość pliku ${filename}`);
  console.log(`   3. Kliknij "Run"`);
}

main().catch(console.error);