-- ============================================================
-- FITPLANNER — Szablony treningów: przypięcie i ostatnie użycie
-- ============================================================
-- Wklej CAŁY ten plik do Supabase → SQL Editor i kliknij "Run".
-- Plik jest idempotentny — można go wykonać więcej niż raz.
--
-- ── Po co to jest ─────────────────────────────────────────────
-- `pinned` — użytkownik przypina szablon, który chce zawsze widzieć
--             na górze listy (niezależnie od wybranego sortowania).
-- `last_used_at` — kiedy szablon ostatnio zastosowano; napędza
--             sortowanie „Ostatnio używane” i komunikat na karcie.
--
-- ── Bez tego skryptu aplikacja działa tak samo ─────────────────
-- Te dwie flagi są w pełni opcjonalne:
--  • klient zapisuje je lokalnie (localStorage) i pokazuje w UI,
--  • przy zapisie do chmury wysyła pełny payload, a jeśli baza
--    zgłosi brak kolumn, automatycznie ponawia zapis bez nich
--    (dlatego nie warto blokować wdrożenia na tym skrypcie).
--
-- RLS nie wymaga zmian: istniejąca polityka „Users can update own
-- templates” pozwala właścicielowi aktualizować własne wiersze.
-- ============================================================


-- ────────────────────────────────────────────────────────────────
-- 1. Kolumny (ADD COLUMN IF NOT EXISTS → bezpieczny ponowny przebieg)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.workout_templates
  ADD COLUMN IF NOT EXISTS pinned       BOOLEAN    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

COMMENT ON COLUMN public.workout_templates.pinned IS
  'Czy użytkownik przypiął szablon (przypięte są na górze listy)';
COMMENT ON COLUMN public.workout_templates.last_used_at IS
  'Kiedy szablon ostatnio zastosowano (sortowanie „Ostatnio używane”)';


-- ────────────────────────────────────────────────────────────────
-- 2. Uzupełnienie istniejących wierszy
-- ────────────────────────────────────────────────────────────────
-- `pinned` ma już wartość domyślną (false). `last_used_at` zostawiamy
-- NULL — szablon jeszcze nigdy nie był użyty.
UPDATE public.workout_templates
   SET pinned = false
 WHERE pinned IS NULL;


-- ────────────────────────────────────────────────────────────────
-- 3. Uprawnienia
-- ────────────────────────────────────────────────────────────────
-- Polityka UPDATE już pozwala właścicielowi na zmianę własnych
-- wierszy, a Supabase domyślnie nadaje rolom `authenticated` pełne
-- prawa na tabele w schemacie `public`. Dla pewności nadajemy je
-- jawnie — bez tego kolumny byłyby tylko do odczytu.
--
-- `anon` NIE dostaje żadnych praw na tę tabelę — szablony są prywatne,
-- a RLS i tak odfiltrowywałby wiersze. Bez grantu jest dodatkowa
-- warstwa bezpieczeństwa na wypadek wyłączenia RLS.
REVOKE ALL ON TABLE public.workout_templates FROM PUBLIC;
REVOKE ALL ON TABLE public.workout_templates FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_templates TO authenticated;
GRANT ALL ON TABLE public.workout_templates TO service_role;

-- Jawne upoważnienie do zapisu dwóch nowych kolumn (niezależne od
-- upoważnienia do całej tabeli) — dokumentuje intencję i działa
-- także wtedy, gdy ktoś ograniczy prawa na poziomie tabeli.
GRANT UPDATE (pinned, last_used_at) ON TABLE public.workout_templates TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 4. Indeks na ostatnie użycie (opcjonalny, ale przyda się przy sortowaniu)
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_templates_last_used
  ON public.workout_templates (user_id, last_used_at DESC NULLS LAST);


-- ────────────────────────────────────────────────────────────────
-- 5. Weryfikacja (opcjonalne zapytania kontrolne)
-- ────────────────────────────────────────────────────────────────
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'workout_templates'
--    AND column_name IN ('pinned', 'last_used_at');
--
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--  WHERE tablename = 'workout_templates';
--
-- Po zmianach DDL Supabase przeładowuje cache PostgREST automatycznie.
-- Jeśli aplikacja nagle zgłosi "permission denied", wykonaj ręcznie:
--   NOTIFY pgrst, 'reload schema';
