# Supabase Setup — FitPlaner

Kompletna instrukcja konfiguracji bazy danych Supabase dla aplikacji FitPlaner.

---

## 1. Klucze API

W panelu Supabase: **Project Settings → API**

| Klucz | Zmienna `.env.local` | Gdzie znaleźć |
|---|---|---|
| Project URL | `VITE_SUPABASE_URL` | Settings → API → Project URL |
| anon (public) | `VITE_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon public` |
| service_role | `VITE_SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Project API keys → `service_role secret` |

### Plik `.env.local`

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Nigdy nie commituj `.env.local` do repozytorium!**
> `service_role` key ma pełny dostęp do bazy — trzymaj go bezpiecznie.

---

## 2. SQL — wklej do Supabase SQL Editor

Przejdź do **SQL Editor** w panelu Supabase i wykonaj poniższy kod:

```sql
-- ============================================================
-- FITPLANER — Schema Setup
-- Wklej całość do SQL Editor i kliknij "Run"
-- ============================================================

-- ── Tabela planów tygodniowych ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.week_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key    TEXT NOT NULL,           -- np. "2025-W03"
  days_data   JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_key)
);

-- ── Tabela własnych ćwiczeń ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id   TEXT NOT NULL,         -- ID ćwiczenia z aplikacji
  exercise_data JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- ── Automatyczna aktualizacja updated_at ──────────────────────
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

-- ── Row Level Security (RLS) ──────────────────────────────────
-- Każdy użytkownik widzi i modyfikuje TYLKO swoje dane

ALTER TABLE public.week_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;

-- Usuń stare polityki jeśli istnieją
DROP POLICY IF EXISTS "week_plans_select" ON public.week_plans;
DROP POLICY IF EXISTS "week_plans_insert" ON public.week_plans;
DROP POLICY IF EXISTS "week_plans_update" ON public.week_plans;
DROP POLICY IF EXISTS "week_plans_delete" ON public.week_plans;
DROP POLICY IF EXISTS "custom_exercises_select" ON public.custom_exercises;
DROP POLICY IF EXISTS "custom_exercises_insert" ON public.custom_exercises;
DROP POLICY IF EXISTS "custom_exercises_update" ON public.custom_exercises;
DROP POLICY IF EXISTS "custom_exercises_delete" ON public.custom_exercises;

-- Polityki dla week_plans
CREATE POLICY "week_plans_select" ON public.week_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "week_plans_insert" ON public.week_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "week_plans_update" ON public.week_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "week_plans_delete" ON public.week_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Polityki dla custom_exercises
CREATE POLICY "custom_exercises_select" ON public.custom_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "custom_exercises_insert" ON public.custom_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_exercises_update" ON public.custom_exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "custom_exercises_delete" ON public.custom_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- ── Funkcja usuwania konta (fallback bez service_role) ────────
-- Używana gdy VITE_SUPABASE_SERVICE_ROLE_KEY nie jest ustawiony.
-- Usuwa dane użytkownika z tabel aplikacji.
-- Samo konto auth.users jest usuwane przez Admin API (service_role).

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Usuń dane z tabel aplikacji
  DELETE FROM public.week_plans WHERE user_id = uid;
  DELETE FROM public.custom_exercises WHERE user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ogranicz dostęp do funkcji tylko dla zalogowanych użytkowników
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ── Indeksy dla wydajności ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_week_plans_user_id ON public.week_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_week_plans_week_key ON public.week_plans(user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);
```

---

## 3. Weryfikacja

Po wykonaniu SQL sprawdź w panelu Supabase:

- **Table Editor** → powinny być widoczne tabele `week_plans` i `custom_exercises`
- **Authentication → Policies** → każda tabela powinna mieć 4 polityki (SELECT, INSERT, UPDATE, DELETE)

---

## 4. Jak działa synchronizacja

### Izolacja danych między użytkownikami

Każdy użytkownik ma **całkowicie oddzielną przestrzeń danych**:

```
Użytkownik A: week_plans WHERE user_id = 'uuid-a'
Użytkownik B: week_plans WHERE user_id = 'uuid-b'
```

RLS (Row Level Security) na poziomie bazy danych gwarantuje że **żaden użytkownik nie może zobaczyć ani zmodyfikować danych innego użytkownika** — nawet jeśli zna jego `user_id`.

### Przepływ przy rejestracji nowego konta

```
1. Użytkownik rejestruje się → Supabase tworzy konto w auth.users
2. Aplikacja loguje użytkownika
3. Synchronizacja pobiera dane z chmury → baza jest pusta → aplikacja startuje z pustym planem
4. Lokalne dane (z trybu anonimowego) NIE są przenoszone na nowe konto
```

> ✅ **Nowe konto zawsze zaczyna z pustym planem** — bez danych z poprzednich sesji anonimowych.

### Przepływ przy logowaniu na istniejące konto

```
1. Użytkownik loguje się
2. Aplikacja czyści localStorage (dane anonimowe/poprzedniego użytkownika)
3. Pobiera wszystkie dane z Supabase dla tego user_id
4. Zapisuje do localStorage jako cache
5. Aplikacja wyświetla plan użytkownika
```

### Przepływ przy wylogowaniu

```
1. Użytkownik wylogowuje się
2. Aplikacja czyści localStorage (week_plans + custom_exercises)
3. Kolejny użytkownik który się zaloguje zobaczy tylko swoje dane z chmury
```

### Tryb offline (bez Supabase)

Jeśli zmienne `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` nie są ustawione:
- Aplikacja działa normalnie — dane zapisywane tylko w localStorage
- Brak synchronizacji między urządzeniami
- Brak logowania/rejestracji

---

## 5. Usuwanie konta

Aplikacja używa dwuetapowego procesu:

### Metoda preferowana (wymaga `service_role`)

```
1. Usuń wiersze z week_plans WHERE user_id = uid
2. Usuń wiersze z custom_exercises WHERE user_id = uid  
3. supabaseAdmin.auth.admin.deleteUser(uid) → usuwa z auth.users
4. Wyloguj lokalnie + wyczyść localStorage
```

### Fallback (bez `service_role`)

```
1. supabase.rpc('delete_user_account') → usuwa dane z tabel
2. supabase.auth.signOut() → wylogowuje
3. Wyczyść localStorage
```

> ⚠️ Bez `service_role` konto pozostaje w `auth.users` ale wszystkie dane są usunięte.
> Użytkownik nie będzie mógł się zalogować (hasło jest nadal aktywne ale baza jest pusta).
> Dla pełnego usunięcia konta wymagany jest klucz `service_role`.

---

## 6. Rozwiązywanie problemów

| Problem | Możliwa przyczyna | Rozwiązanie |
|---|---|---|
| Nowe konto ma dane poprzedniego użytkownika | Stara wersja kodu (bug pushLocalDataToCloud) | Zaktualizuj kod do najnowszej wersji |
| Dane nie synchronizują się | Błędne klucze API | Sprawdź `.env.local` i uruchom ponownie |
| Nie można usunąć konta | Brak `service_role` | Dodaj `VITE_SUPABASE_SERVICE_ROLE_KEY` do `.env.local` |
| Błąd RLS przy zapisie | Brak polityk | Wykonaj ponownie SQL z sekcji 2 |
| Tabele nie istnieją | SQL nie został wykonany | Wklej SQL do SQL Editor i kliknij Run |
