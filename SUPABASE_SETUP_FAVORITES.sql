-- ============================================================
-- FITPLANER — Ulubione ćwiczenia (tabela + RLS)
--
-- Wklej do Supabase → SQL Editor i kliknij "Run".
-- Skrypt jest idempotentny i NAPRAWCZY — możesz go uruchomić wielokrotnie,
-- nawet jeśli tabela już istnieje (np. utworzona ręcznie w Table Editor).
--
-- Błąd, który ten skrypt naprawia:
--   "new row violates row-level security policy for table favorite_exercises"
--   → tabela istnieje, ale brakuje na niej polityk RLS (albo są nieaktualne).
-- ============================================================

-- ── 1. Tabela ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorite_exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,              -- ID ćwiczenia z aplikacji
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Gdy tabela istniała już, ale miała inne kolumny — dociągamy brakujące.
ALTER TABLE public.favorite_exercises
  ADD COLUMN IF NOT EXISTS user_id     UUID,
  ADD COLUMN IF NOT EXISTS exercise_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- Klucz obcy (kaskada przy kasowaniu konta) — tylko jeśli jeszcze go nie ma.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.favorite_exercises'::regclass
      AND contype = 'f'
  ) THEN
    ALTER TABLE public.favorite_exercises
      ADD CONSTRAINT favorite_exercises_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Unikalność (user_id, exercise_id) — wymagana przez upsert w aplikacji.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.favorite_exercises'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%user_id%exercise_id%'
  ) THEN
    ALTER TABLE public.favorite_exercises
      ADD CONSTRAINT favorite_exercises_user_id_exercise_id_key
      UNIQUE(user_id, exercise_id);
  END IF;
END $$;

-- ── 2. RLS ───────────────────────────────────────────────────────
ALTER TABLE public.favorite_exercises ENABLE ROW LEVEL SECURITY;

-- Usuwamy stare polityki (mogły być nieaktualne albo ich nie było).
DROP POLICY IF EXISTS "favorite_exercises_select" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_insert" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_update" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_delete" ON public.favorite_exercises;

-- Każdy użytkownik widzi i modyfikuje TYLKO swoje ulubione.
CREATE POLICY "favorite_exercises_select" ON public.favorite_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_insert" ON public.favorite_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_update" ON public.favorite_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_delete" ON public.favorite_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- ── 3. Uprawnienia ───────────────────────────────────────────────
REVOKE ALL ON TABLE public.favorite_exercises FROM PUBLIC;
REVOKE ALL ON TABLE public.favorite_exercises FROM anon;
REVOKE ALL ON TABLE public.favorite_exercises FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorite_exercises TO authenticated;
GRANT ALL ON TABLE public.favorite_exercises TO service_role;

-- ── 4. Indeks ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorite_exercises_user_id
  ON public.favorite_exercises(user_id);

-- ── 5. Weryfikacja (wyniki powinny pokazać 4 polityki) ─────────────
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--   WHERE tablename = 'favorite_exercises' ORDER BY policyname;
--
-- SELECT has_table_privilege('anon', 'public.favorite_exercises', 'SELECT')         AS anon_select,
--        has_table_privilege('anon', 'public.favorite_exercises', 'INSERT')         AS anon_insert,
--        has_table_privilege('authenticated', 'public.favorite_exercises', 'INSERT') AS auth_insert;
