# Supabase Setup — FitPlaner

Kompletna instrukcja konfiguracji bazy danych Supabase dla aplikacji FitPlaner.

---

## 1. Klucze API

W panelu Supabase: **Project Settings → API**

| Klucz | Zmienna `.env.local` | Gdzie znaleźć | Używany przez |
|---|---|---|---|
| Project URL | `VITE_SUPABASE_URL` | Settings → API → Project URL | frontend + backup |
| anon (public) | `VITE_SUPABASE_ANON_KEY` | Settings → API → Project API keys → `anon public` | frontend |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → Project API keys → `service_role secret` | **tylko** `BACKUP NODE/backup.mjs` |

### Plik `.env.local`

```env
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Nigdy nie commituj `.env.local` do repozytorium!**
> `service_role` ma pełny dostęp do bazy — trzymaj go bezpiecznie.

### Dlaczego `service_role` NIE ma prefiksu `VITE_`

Build aplikacji używa `vite-plugin-singlefile` — cała aplikacja ląduje w jednym
pliku `dist/index.html`. Vite **wbudowuje wszystkie zmienne `VITE_*` do bundla**,
więc klucz z prefiksem `VITE_` ląduje w publicznym pliku i każdy odwiedzający
może go wyciągnąć, a potem ominąć RLS i czytać dane wszystkich użytkowników.

Dlatego:
- **frontend używa wyłącznie klucza `anon`** — cała komunikacja idzie pod RLS;
- **`service_role` ma nazwę BEZ prefiksu `VITE_`** — Vite go nie wbudowuje, a
  skrypt backupowy czyta `.env.local` sam (ręczny parser, `BACKUP NODE/backup.mjs`).

> 🔴 **ROTACJA KLUCZA — pilne.** Wcześniejsza wersja aplikacji miała klucz
> `service_role` w bundlu. **Samo przebudowanie aplikacji NIE unieważnia
> publicznie ujawnionego klucza.** Trzeba go zrotować ręcznie:
>
> 1. Supabase → **Project Settings → API → Project API keys → `service_role secret`**
> 2. **Generate new secret / Regenerate** (albo wgraj nowy klucz)
> 3. Podmień wartość `SUPABASE_SERVICE_ROLE_KEY` w **dwóch** plikach:
>    - `.env.local` (w katalogu głównym)
>    - `BACKUP NODE/.env.local`
> 4. Dopiero potem wdrożenie nowej wersji (`npm run build`).

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

-- ── Indeksy dla wydajności ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_week_plans_user_id ON public.week_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_week_plans_week_key ON public.week_plans(user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);
```

> 📌 **Funkcja `delete_user_account()` instaluje się razem z udostępnianiem**
> (plik `SUPABASE_SETUP_SHARES.sql`, sekcja 7) — nie z tego miejsca. Patrz
> sekcja 5 poniżej.

---

## 3. Udostępnianie treningów

Wklej **całość** pliku **`SUPABASE_SETUP_SHARES.sql`** do Supabase → SQL Editor
i kliknij **Run**. Plik jest idempotentny (`IF NOT EXISTS`, `DROP POLICY IF
EXISTS`) — można go uruchomić ponownie bez obaw.

### Co tworzy ten plik

| Element | Po co |
|---|---|
| `public.current_user_email()` | Autorytatywny odczyt e-maila zalogowanego użytkownika z `auth.users` (claim `email` w JWT to tylko snapshot i potrafi się rozjechać z wielkością liter) |
| `public.shared_workouts` | Tabela udostępnień: migawka dnia treningowego, nadawca, odbiorca (po e-mailu), status |
| `public.normalize_share()` | Trigger `BEFORE INSERT` — ustawia `owner_id`, `owner_email`, `owner_name`, normalizuje `recipient_email`, wymusza `status = 'pending'` |
| Polityki RLS (4) | Nadawca widzi swoje, odbiorca widzi udostępnione na jego e-mail |
| Rozszerzone `delete_user_account()` | Kasuje też wiersze `shared_workouts` (zarówno jako nadawca, jak i jako odbiorca) ORAZ samo konto z `auth.users` |
| Hardening `week_plans` / `custom_exercises` | `REVOKE ALL` dla `PUBLIC`/`anon`/`authenticated`, potem dokładne `GRANT` |
| `GRANT ALL` dla `service_role` | Skrypt `BACKUP NODE/backup.mjs` czyta tabele kluczem admina — jawne uprawnienie, żeby zrzut działał po `REVOKE ... FROM PUBLIC` |

### Jak działa dopasowanie odbiorcy

Odbiorca jest identyfikowany **po adresie e-mail wewnątrz polityki RLS**:

```sql
-- polityka SELECT
owner_id = (SELECT auth.uid())
OR recipient_email = (SELECT public.current_user_email())
```

Serwer **nigdy nie rozwiązuje `email → user_id`**. To ma trzy konsekwencje:

1. **Aplikacja nie może ujawnić, czy konto odbiorcy istnieje** — nie ma
   zapytania, które odróżniałoby istniejący e-mail od nieistniejącego. Nadawca
   zawsze widzi „Udostępniono", niezależnie od wyniku.
2. **Udostępnienie może poczekać na późniejszą rejestrację** — wiersz w bazie
   czeka, aż ktoś założy konto z tym adresem.
3. **W ścieżce zapisu nie ma `service_role`** — wszystko idzie na kluczu `anon`
   pod ochroną RLS.

### Uprawnienia odbiorcy (column-level)

```sql
GRANT UPDATE (status, accepted_at, accepted_week_key, accepted_day_index, updated_at)
  ON public.shared_workouts TO authenticated;
```

Odbiorca może zmienić **tylko** te kolumny — nie dosięgnie `day_data`,
`owner_id` ani `recipient_email`. Polityka UPDATE dodatkowo zamarza wiersz
(`USING ... status = 'pending'`), więc nie da się zaakceptować drugi raz ani
cofnąć własnej decyzji.

### Prywatność migawki

Przed wysłaniem danych do bazy (po stronie przeglądarki nadawcy) usuwane jest:
- `note` — prywatna notatka nadawcy o serii (np. „ból kolana"); **nigdy nie trafia
  do bazy**,
- `done` — resetowane na `false` (trening ma być do wykonania),
- `id` — nadawca nadaje nowe identyfikatory przy odbiorze.

`weight` i `actualReps` zostają jako referencja — spójnie z istniejącym
przyciskiem „Kopiuj trening".

### Odtwarzanie bazy z backupu

Skrypt `BACKUP NODE/backup.mjs` zapisuje pełny zrzut (dane + składnia DDL w
komentarzu). Aby odtworzyć bazę: wklej plik `backup_*.sql` do
Supabase → **SQL Editor** i kliknij **Run**.

Dwie rzeczy warto wiedzieć:

- **Trigger `trg_normalize_share` nie blokuje odtwarzania.** Przy wstawianiu
  z pliku backupowego nie ma sesji użytkownika (`auth.uid()` jest NULL), więc
  trigger przepuszcza wiersz, w którym `owner_id` jest już podane. Prawo
  wstawienia pilnuje i tak polityka RLS INSERT (`owner_id = auth.uid()`) —
  ten tryb **nie** otwiera drogi obejścia RLS.
- **Tabele `week_plans` i `shared_workouts` mają klucze obce do `auth.users`**
  (`user_id` / `owner_id`). Odtwarzanie powiodzie się tylko wtedy, gdy konta
  tych użytkowników już istnieją w bazie — inaczej naruszenie klucza obcego
  zatrzyma skrypt.

---

## 4. Weryfikacja

Po wykonaniu SQL sprawdź w panelu Supabase:

- **Table Editor** → widoczne tabele `week_plans`, `custom_exercises` i `shared_workouts`
- **Authentication → Policies** → `week_plans` i `custom_exercises` mają po 4
  polityki, `shared_workouts` ma 4 (SELECT / INSERT / UPDATE / DELETE)
- **SQL Editor** → kontrolka uprawnień (anon nie ma dostępu do tabel):

```sql
-- powinno zwrócić 0 wierszy dla roli anon
SELECT * FROM public.shared_workouts;

-- uprawnienia: anon nie ma nic, authenticated ma tylko wskazane kolumny,
-- service_role musi czytać (skrypt backupowy)
SELECT has_table_privilege('anon', 'public.shared_workouts', 'SELECT')           AS anon_select,
       has_table_privilege('anon', 'public.shared_workouts', 'TRUNCATE')         AS anon_truncate,
       has_column_privilege('authenticated', 'public.shared_workouts', 'day_data', 'UPDATE') AS auth_update_day_data,
       has_table_privilege('service_role', 'public.shared_workouts', 'SELECT')    AS backup_read;
```

Oczekiwany wynik: `anon_select = false`, `anon_truncate = false`,
`auth_update_day_data = false`, `backup_read = true`.

---

## 5. Jak działa synchronizacja

### Izolacja danych między użytkownikami

Każdy użytkownik ma **całkowicie oddzielną przestrzeń danych**:

```
Użytkownik A: week_plans WHERE user_id = 'uuid-a'
Użytkownik B: week_plans WHERE user_id = 'uuid-b'
```

RLS (Row Level Security) na poziomie bazy danych gwarantuje że **żaden użytkownik nie może zobaczyć ani zmodyfikować danych innego użytkownika** — nawet jeśli zna jego `user_id`.

**Wyjątek — udostępnienia:** to jedyny przepływ danych między kontami i
jest on jawny, dwustronny: nadawca świadomie udostępnia swój dzień, odbiorca
świadomie go akceptuje. Reszta danych pozostaje oddzielona.

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
- **Udostępnianie jest wyłączone** (przycisk udostępniania się nie pojawia)

---

## 6. Usuwanie konta

Aplikacja korzysta **wyłącznie** z funkcji SQL `delete_user_account()`
(`SECURITY DEFINER`). Klucz `service_role` nie jest używany w frontendzie —
build wbudowuje wszystkie zmienne `VITE_*` do publicznego bundle, więc klucz
admina byłby widoczny dla każdego odwiedzającego.

### Co robi funkcja (instalowana w `SUPABASE_SETUP_SHARES.sql`, sekcja 7)

```
1. DELETE FROM week_plans        WHERE user_id = uid
2. DELETE FROM custom_exercises  WHERE user_id = uid
3. DELETE FROM shared_workouts   WHERE owner_id = uid
                                 OR recipient_email = (e-mail użytkownika)
4. DELETE FROM auth.sessions / auth.identities / auth.users  → konto znika całkowicie
```

Punkt 3 usuwa udostępnienia w **obu** rolach — nadawcy i odbiorcy. Wcześniejsza
wersja kasowała tylko wiersze własnych planów, a konto zostawało w `auth.users`.

### Przepływ w aplikacji

```
1. supabase.rpc('delete_user_account')  → kasuje dane + konto
2. Wyczyść localStorage i sesję lokalnie
```

> ⚠️ Po `DELETE FROM auth.users` wydany access token działa do końca jego
> ważności (do ~1 h) — usunięty użytkownik może w tym krótkim oknie jeszcze
> odpytać API. Dlatego funkcja kasuje **również** `auth.sessions`.

> ⚠️ Jeśli funkcja nie jest wgrana, aplikacja pokaże komunikat:
> *„Nie udało się usunąć konta. Upewnij się, że funkcja delete_user_account()
> jest wgrana do bazy"*. Wtedy wklej `SUPABASE_SETUP_SHARES.sql` i kliknij Run.

---

## 7. Rozwiązywanie problemów

| Problem | Możliwa przyczyna | Rozwiązanie |
|---|---|---|
| Nowe konto ma dane poprzedniego użytkownika | Stara wersja kodu (bug pushLocalDataToCloud) | Zaktualizuj kod do najnowszej wersji |
| Dane nie synchronizują się | Błędne klucze API | Sprawdź `.env.local` i uruchom ponownie |
| Nie można usunąć konta | Brak funkcji `delete_user_account()` | Wklej `SUPABASE_SETUP_SHARES.sql` do SQL Editor i kliknij Run |
| `42P13: cannot change return type of existing function` | W bazie jest starsza wersja `delete_user_account()` z innym typem zwracanym — `CREATE OR REPLACE` nie pozwala zmienić typu zwracanego | Skrypt kasuje stare wersje funkcji w swojej **sekcji 0** — wklej **cały** `SUPABASE_SETUP_SHARES.sql` ponownie i kliknij Run. Uruchomienie w SQL Editor jest jedną transakcją, więc nieudane próby nie zostawiają niczego w bazie |
| Błąd RLS przy zapisie | Brak polityk | Wykonaj ponownie SQL z sekcji 2 i 3 |
| Tabele nie istnieją | SQL nie został wykonany | Wklej SQL do SQL Editor i kliknij Run |
| Brak przycisku udostępniania | Tryb demo, brak Supabase albo dzień bez ćwiczeń | Udostępnianie działa tylko dla zalogowanego konta (nie demo) i tylko dla dni z ćwiczeniami |
| Udostępnienie nie pojawia się u odbiorcy | Różny adres e-mail (inny zapis/alias) | E-mail musi być identyczny po normalizacji (`lower` + `trim`) — sprawdź w Table Editor, czy `recipient_email` jest zapisany tak samo jak `auth.users.email` odbiorcy |
| Odbiorca widzi „Udostępnienie zostało już rozpatrzone" | Wiersz rozpatrzony w innej sesji | Odśwież listę (`Odśwież`) — status zapisuje się w bazie |
| `invalid input syntax for type uuid` w konsoli |Próba użycia `service_role` / konta demo w tabelach z FK do `auth.users` | Udostępnianie jest wyłączone w trybie demo — zaloguj się na prawdziwe konto |
| `permission denied for table shared_workouts` | Nie wgrany `SUPABASE_SETUP_SHARES.sql` albo brak `GRANT` | Wklej plik do SQL Editor i kliknij Run (sekcja 5 pliku) |
| Bundle zawiera klucz `service_role` | Zmienna z prefiksem `VITE_` w `.env.local` | Zmień nazwę na `SUPABASE_SERVICE_ROLE_KEY` (bez `VITE_`) i **zrotuj klucz** w panelu Supabase |
| Logowanie przez Google nie działa | Ekran zgody w Google jest w statusie **Testowanie** | W Google Cloud Console → *OAuth consent screen* kliknij **Publish app** (albo dodaj konta do *Test users*) — w trybie testowym zalogują się tylko konta testowe |
| Logowanie przez Google kończy się błędem `redirect_uri_mismatch` | Brak adresu callbacku w Google Cloud Console | Dodaj `https://<ref-projektu>.supabase.co/auth/v1/callback` do *Authorized redirect URIs* (patrz sekcja 8) |
| Logowanie przez Google wraca na adres z błędem | Adres powrotu nie ma w *Redirect URLs* w Supabase | Dodaj `https://<domena-aplikacji>` do *Authentication → URL Configuration → Redirect URLs* |
| Przycisk „Kontynuuj z Apple” nie pojawia się | Provider Apple nie jest włączony w Supabase | Włącz w *Authentication → Providers → Apple* i uzupełnij Client ID / Secret (Apple wymaga też Service ID i własnej domeny) |

---

## 8. Logowanie przez Google / Apple (OAuth)

Aplikacja loguje przez dostawcę OAuth **bez własnej strony pośredniej** — Supabase
przekierowuje do Google, a po powrocie wymienia kod na sesję (flow **PKCE**).

### 8.1. Google Cloud Console

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - *Application type*: **Web application**
   - *Authorized redirect URIs*:
     ```
     https://<ref-projektu>.supabase.co/auth/v1/callback
     ```
     (`<ref-projektu>` to fragment adresu projektu, np. `abcdefghijklm`)
   - *Authorized JavaScript origins*:
     ```
     https://<ref-projektu>.supabase.co
     https://<domena-aplikacji>
     ```
2. Skopiuj **Client ID** i **Client Secret**.
3. **OAuth consent screen**:
   - uzupełnij nazwę, e-mail konta i logo,
   - dodaj zakresy `email` i `profile`,
   - **Publish app** — dopóki ekran zgody jest w statusie *Testing*, zalogują się
     tylko konta dodane w sekcji *Test users*.

### 8.2. Supabase

1. **Authentication → Providers → Google**
   - włącz provider,
   - wklej **Client ID** i **Client Secret** z Google Cloud Console,
   - zaznacz opcję automatycznego tworzenia konta (*Create account automatically*).
2. **Authentication → URL Configuration**
   - **Site URL**: adres produkcyjny aplikacji (np. `https://twoja-domena.pl`).
     To adres, na który Supabase odsyła użytkownika, gdy adres powrotu nie jest
     dozwolony — **nie ustawiaj tu adresu `localhost`**, bo jest to awaria, która
     dotknie wszystkich użytkowników, nie tylko developera.
   - **Redirect URLs** — lista adresów, na które aplikacja może wrócić po logowaniu:
     ```
     https://twoja-domena.pl
     http://localhost:5173
     http://127.0.0.1:5173
     http://localhost:4173
     http://127.0.0.1:4173
     ```
     ⚠️ `localhost` i `127.0.0.1` to dla Supabase **dwa różne adresy** — trzeba
     dodać oba. Adresy **previewów na Vercelu** mają losowe hosty — albo dodaj
     wildcard `https://*.vercel.app`, albo loguj się z adresu produkcyjnego.

### 8.2.1. Port serwera deweloperskiego musi być stały

Logowanie OAuth wraca dokładnie na ten adres, z którego zostało wywołane.
Vite przy zajętym porcie **przeskakuje na następny wolny** (5173 → 5174 → …),
a takiego adresu zwykle nie ma na liście Redirect URLs. Dlatego skrypt `dev`
uruchamia się z flagą `--strictPort` — przy zajętym porcie zamiast przeskoczyć
wyrzuca błąd. Zanim uruchomisz `npm run dev`, zamknij stare instancje:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'vite' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

### 8.3. Jak aplikacja to obsługuje

- Przed przekierowaniem sprawdza publiczny endpoint `/auth/v1/settings` —
  **przyciski pokazywane są tylko dla dostawców włączonych w projekcie**
  (kliknięcie w nieskonfigurowany provider kończyłoby się surowym ekranem JSON z błędem 400).
- Adres powrotu to `window.location.origin` — dzięki temu ten sam kod działa
  na produkcji i na `localhost`.
- Błędy z callbacku (`?error=...` w adresie) są pokazywane w formularzu
  (np. *„Logowanie zostało anulowane.”*), a adres jest czyszczony, żeby
  odświeżenie strony nie pokazywało tego samego błędu.
- Użytkownik zalogowany przez Google ma potwierdzony e-mail, więc logowanie
  email/hasło działa dla tego samego konta.

