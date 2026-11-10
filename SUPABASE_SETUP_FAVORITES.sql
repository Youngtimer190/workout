-- ============================================================
-- FITPLANER — Ulubione ćwiczenia
--
-- Wklej do Supabase → SQL Editor i kliknij "Run".
-- Skrypt jest idempotentny (IF NOT EXISTS / DROP POLICY IF EXISTS),
-- więc można go uruchomić wielokrotnie.
--
-- Tabela przechowuje same identyfikatory ćwiczeń — pełne dane
-- ćwiczenia są już w bibliotece aplikacji (`src/data/exercises.ts`).
-- ============================================================

-- ── Tabela ulubionych ćwiczeń ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorite_exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,              -- ID ćwiczenia z aplikacji
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- ── Row Level Security ──────────────────────────────────────────
-- Każdy użytkownik widzi i modyfikuje TYLKO swoje ulubione.
ALTER TABLE public.favorite_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorite_exercises_select" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_insert" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_update" ON public.favorite_exercises;
DROP POLICY IF EXISTS "favorite_exercises_delete" ON public.favorite_exercises;

CREATE POLICY "favorite_exercises_select" ON public.favorite_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_insert" ON public.favorite_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_update" ON public.favorite_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "favorite_exercises_delete" ON public.favorite_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- ── Indeks dla wydajności ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorite_exercises_user_id
  ON public.favorite_exercises(user_id);

-- ── Uprawnienia ──────────────────────────────────────────────────
-- Tabelę tworzymy w schemacie `public`, więc domyślnie dziedziczy
-- GRANT ALL dla roli `anon`. Bez poniższych REVOKE niezalogowany
-- użytkownik mógłby odpytać tabelę (RLS i tak blokuje odczyt,
-- ale nie polegamy na samej polityce).
REVOKE ALL ON TABLE public.favorite_exercises FROM PUBLIC;
REVOKE ALL ON TABLE public.favorite_exercises FROM anon;
REVOKE ALL ON TABLE public.favorite_exercises FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorite_exercises TO authenticated;
GRANT ALL ON TABLE public.favorite_exercises TO service_role;

-- ── Usuwanie konta ───────────────────────────────────────────────
-- Wiersze ulubionych znikają automatycznie razem z kontem
-- (ON DELETE CASCADE na kluczu obcym do auth.users).
