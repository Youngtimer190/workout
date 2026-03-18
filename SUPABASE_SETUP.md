# 🗄️ Instrukcja konfiguracji Supabase dla FitPlaner

## 1. Utwórz projekt w Supabase

1. Przejdź na [supabase.com](https://supabase.com) i zaloguj się
2. Kliknij **"New Project"**
3. Wybierz organizację, podaj nazwę projektu (np. `fitplaner`) i hasło do bazy danych
4. Wybierz region (np. `eu-central-1` dla Europy)
5. Kliknij **"Create new project"** i poczekaj ~2 minuty

---

## 2. Pobierz klucze API

1. W panelu projektu przejdź do **Settings → API**
2. Skopiuj trzy wartości:

| Klucz | Gdzie znaleźć | Zmienna w `.env.local` |
|-------|--------------|----------------------|
| **Project URL** | Settings → API → Project URL | `VITE_SUPABASE_URL` |
| **anon public** | Settings → API → Project API keys → `anon` `public` | `VITE_SUPABASE_ANON_KEY` |
| **service_role** | Settings → API → Project API keys → `service_role` `secret` | `VITE_SUPABASE_SERVICE_ROLE_KEY` |

3. Wklej do pliku `.env.local` w głównym katalogu projektu:

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **WAŻNE — klucz `service_role`:**
> - Ma **pełny dostęp** do bazy danych, omija Row Level Security
> - Używany **wyłącznie** do usuwania konta użytkownika (admin API)
> - **Nie commituj** pliku `.env.local` do repozytorium (jest w `.gitignore`)
> - W środowisku produkcyjnym ustaw go jako zmienną środowiskową serwera
> - Bez tego klucza usuwanie konta będzie działać przez fallback RPC (wymaga kroku 3)

---

## 3. Wklej SQL do edytora Supabase

1. W panelu projektu przejdź do **SQL Editor**
2. Kliknij **"New query"**
3. Wklej **cały poniższy kod SQL** i kliknij **"Run"**

```sql
-- ============================================================
-- FitPlaner — Schemat bazy danych
-- Wklej cały poniższy kod do SQL Editor w Supabase i uruchom
-- ============================================================

-- ─── Włącz rozszerzenie UUID ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tabela: plany tygodniowe ─────────────────────────────────
-- Każdy wiersz to plan treningowy jednego użytkownika na jeden tydzień.
-- week_key ma format "YYYY-Www", np. "2025-W03"
CREATE TABLE IF NOT EXISTS public.week_plans (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key     TEXT NOT NULL,                    -- np. "2025-W03"
  days_data    JSONB NOT NULL DEFAULT '[]',      -- tablica WorkoutDay[]
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Jeden użytkownik może mieć tylko jeden plan na tydzień
  UNIQUE(user_id, week_key)
);

-- ─── Tabela: własne ćwiczenia użytkownika ────────────────────
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id    TEXT NOT NULL,                   -- ID ćwiczenia z aplikacji
  exercise_data  JSONB NOT NULL DEFAULT '{}',     -- obiekt Exercise
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),

  -- Jeden użytkownik może mieć tylko jedno ćwiczenie o danym ID
  UNIQUE(user_id, exercise_id)
);

-- ─── Indeksy dla wydajności ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_week_plans_user_id      ON public.week_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_week_plans_week_key     ON public.week_plans(week_key);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);

-- ─── Row Level Security (RLS) ─────────────────────────────────
-- WAŻNE: RLS zapewnia że każdy użytkownik widzi TYLKO swoje dane

ALTER TABLE public.week_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises  ENABLE ROW LEVEL SECURITY;

-- Polityki dla week_plans
CREATE POLICY "Users select own week_plans"
  ON public.week_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own week_plans"
  ON public.week_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own week_plans"
  ON public.week_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own week_plans"
  ON public.week_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Polityki dla custom_exercises
CREATE POLICY "Users select own custom_exercises"
  ON public.custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom_exercises"
  ON public.custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom_exercises"
  ON public.custom_exercises FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own custom_exercises"
  ON public.custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Funkcja automatycznej aktualizacji updated_at ───────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger dla week_plans
DROP TRIGGER IF EXISTS set_week_plans_updated_at ON public.week_plans;
CREATE TRIGGER set_week_plans_updated_at
  BEFORE UPDATE ON public.week_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger dla custom_exercises
DROP TRIGGER IF EXISTS set_custom_exercises_updated_at ON public.custom_exercises;
CREATE TRIGGER set_custom_exercises_updated_at
  BEFORE UPDATE ON public.custom_exercises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Funkcja usuwania danych użytkownika (fallback) ──────────
-- Ta funkcja jest używana jako FALLBACK gdy klucz service_role
-- nie jest skonfigurowany. Usuwa dane z tabel aplikacji.
-- Samo konto auth.users jest usuwane przez Admin API (service_role).
--
-- Jeśli masz skonfigurowany service_role w .env.local,
-- ta funkcja nie jest wywoływana (Admin API radzi sobie sam).
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID;
  deleted_plans   INT;
  deleted_ex      INT;
BEGIN
  calling_user_id := auth.uid();

  IF calling_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Użytkownik nie jest zalogowany'
    );
  END IF;

  -- Usuń plany tygodniowe
  DELETE FROM public.week_plans WHERE user_id = calling_user_id;
  GET DIAGNOSTICS deleted_plans = ROW_COUNT;

  -- Usuń własne ćwiczenia
  DELETE FROM public.custom_exercises WHERE user_id = calling_user_id;
  GET DIAGNOSTICS deleted_ex = ROW_COUNT;

  RETURN json_build_object(
    'success',       true,
    'deleted_plans', deleted_plans,
    'deleted_exercises', deleted_ex,
    'note', 'Dane usunięte. Konto auth wymaga usunięcia przez Admin API (service_role).'
  );
END;
$$;

-- Nadaj uprawnienia do wykonania funkcji zalogowanym użytkownikom
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ─── Koniec skryptu ───────────────────────────────────────────
-- Sprawdź czy tabele zostały utworzone:
-- Table Editor → week_plans i custom_exercises
-- Sprawdź czy RLS jest aktywne:
-- Authentication → Policies
```

---

## 4. Skonfiguruj autoryzację email

1. Przejdź do **Authentication → Providers → Email**
2. Upewnij się że **"Enable Email provider"** jest włączone ✅
3. **Opcjonalnie (zalecane podczas dev):** wyłącz **"Confirm email"** aby logowanie działało bez weryfikacji emaila

### Opcjonalnie: Własne szablony emaili

W **Authentication → Email Templates** możesz dostosować wygląd emaili (potwierdzenie rejestracji, reset hasła).

---

## 5. Skonfiguruj URL przekierowania

1. Przejdź do **Authentication → URL Configuration**
2. Dodaj URL swojej aplikacji do **"Redirect URLs"**:
   - `http://localhost:5173` (development)
   - `https://twoja-domena.com` (produkcja)

---

## 6. Uruchom aplikację

```bash
npm run dev
```

Po skonfigurowaniu zmiennych środowiskowych aplikacja:
- ✅ Pokaże ekran logowania/rejestracji
- ✅ Zsynchronizuje dane między urządzeniami
- ✅ Każdy użytkownik będzie miał osobną przestrzeń danych
- ✅ Dane lokalne z localStorage zostaną automatycznie przesłane do chmury przy pierwszym logowaniu
- ✅ Usuwanie konta działa niezawodnie przez Admin API

---

## 🔒 Bezpieczeństwo

| Element | Opis |
|---------|------|
| **Row Level Security (RLS)** | Włączone na obu tabelach — użytkownicy widzą TYLKO swoje dane |
| **Klucz `anon`** | Bezpieczny do użycia w przeglądarce — RLS go chroni |
| **Klucz `service_role`** | Używany wyłącznie do `auth.admin.deleteUser()` — nie jest przesyłany na serwer, działa po stronie klienta tylko do tej jednej operacji |
| **ON DELETE CASCADE** | Usunięcie konta z `auth.users` automatycznie usuwa wszystkie powiązane dane |
| **Funkcja RPC** | Fallback do usuwania danych gdy brak `service_role` |

---

## 🐛 Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| "Brak zmiennych środowiskowych" | Sprawdź czy `.env.local` istnieje i zawiera poprawne klucze. Zrestartuj `npm run dev` po zmianach. |
| Błąd 401 Unauthorized | Sprawdź czy klucz `anon` jest poprawny |
| Dane nie synchronizują się | Sprawdź czy RLS jest poprawnie skonfigurowane w Authentication → Policies |
| Nie można usunąć konta | Upewnij się że `VITE_SUPABASE_SERVICE_ROLE_KEY` jest ustawiony w `.env.local`. Jeśli nie masz klucza service_role — funkcja SQL `delete_user_account()` musi być wgrana (krok 3). |
| "User not allowed" przy usuwaniu konta | Dodaj klucz `service_role` do `.env.local` — to jest wymagane do usunięcia z `auth.users` |
| Email potwierdzający nie przychodzi | Sprawdź folder spam lub wyłącz "Confirm email" w Authentication → Providers → Email |
| Duplikaty danych po synchronizacji | Normalne przy pierwszym logowaniu — `upsert` z `onConflict` obsługuje duplikaty |

---

## 📁 Struktura pliku `.env.local`

```env
# ─── Supabase ────────────────────────────────────────────────────
# Settings → API → Project URL
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co

# Settings → API → Project API keys → anon public
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...

# Settings → API → Project API keys → service_role secret
# Wymagane do niezawodnego usuwania kont użytkowników
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

> 💡 Plik `.env.local` jest automatycznie ignorowany przez Git (`.gitignore`).
> Nigdy nie wklejaj tych kluczy bezpośrednio w kodzie ani nie wysyłaj na GitHub.
