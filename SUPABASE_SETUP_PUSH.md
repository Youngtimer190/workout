# FitPlanner — powiadomienia push (koniec przerwy)

Powiadomienie systemowe o końcu przerwy działa jako **zabezpieczenie**:
dźwięk w przeglądarce milczy, gdy użytkownik przełączy się do innej apki
albo ekran wygasnie. Push dociera nawet do zablokowanego ekranu.

## Co trzeba zrobić (jednorazowo)

> **Stan na 14.11.2026: wdrożone ✓** — funkcja jest na serwerze, sekrety VAPID
> ustawione, tabele i polityki RLS utworzone. Poniższe kroki zostały wykonane;
> komendy zostają w instrukcji, gdybyś kiedyś musiał(a) to powtórzyć
> (np. po migracji projektu).

### 1. Tabele w bazie

W konsoli Supabase (**Dashboard → SQL Editor**) wklej i wykonaj:

```sql
\i SUPABASE_SETUP_PUSH.sql
```

albo wklej zawartość pliku `SUPABASE_SETUP_PUSH.sql` i naciśnij **Run**.

Powstaną dwie tabele: `push_subscriptions` i `push_schedules`, obie z RLS
(tylko własne wiersze).

> Alternatywa przez CLI (to samo, co zostało wykonane):
> ```bash
> supabase db query --file supabase/migrations/20261114120000_push_notifications.sql --remote --yes
> ```

### 2. Edge Function

Potrzebny jest [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
supabase login
supabase link --project-ref mktkwysqcaafmjfkxqty
supabase functions deploy rest-timer-push
```

> **Uwaga:** komendy uruchamiaj **z katalogu głównego repozytorium**
> (tam, gdzie jest folder `supabase/`). CLI szuka funkcji względem bieżącego
> katalogu — uruchomione z `supabase/functions/` szuka ścieżki
> `supabase/functions/supabase/functions/…` i kończy się błędem
> „Entrypoint path does not exist".
>
> Ostrzeżenie „Docker is not running” jest nieszkodliwe — Docker jest
> potrzebny tylko do lokalnego developmentu, nie do wdrożenia w chmurze.

### 3. Klucze VAPID jako sekrety

Klucze są już wygenerowane i zapisane w `supabase/functions/.env`
(plik **nie jest** w repo — jest w `.gitignore`).

```bash
supabase secrets set --env-file supabase/functions/.env --yes
```

albo ręcznie:

```bash
supabase secrets set VAPID_PUBLIC_KEY=<wartość z pliku> VAPID_PRIVATE_KEY=<wartość z pliku> VAPID_SUBJECT=mailto:angelika_pawelek@wp.pl
```

Klucz **publiczny** jest już wpisany w `src/lib/pushConfig.ts` — to normalne,
klucz publiczny jest z definicji jawny.

## Jak sprawdzić, czy działa

1. Na telefonie otwórz aplikację w przeglądarce i **dodaj ją do ekranu
   głównego** (iOS wymaga tego dla powiadomień).
2. Wejdź na konto (tryb demo nie obsługuje powiadomień).
3. **Więcej → Timer odpoczynku → Powiadomienie systemowe → włącz.**
4. Zaznacz serię w trackerze (przerwa startuje sama).
5. Zablokuj telefon i poczekaj, aż minie przerwa — powinno przyjść
   powiadomienie „Czas!”.

## Kto dzwoni — podział obowiązków

To jest najważniejsza rzecz do zrozumienia: **dźwięk w przeglądarce i
powiadomienie systemowe to dwa różne alarmy, z których każdy działa w innym
momencie.**

| Stan telefonu | Dźwięk lokalny (dzwonek) | Powiadomienie push |
|---|---|---|
| Ekran włączony, aplikacja na wierzchu | gra natychmiast | **wyciszone** (aplikacja anuluje je, gdy sama zagrała dzwonek) |
| Ekran włączony, przełączono się do innej aplikacji | **milczy** — system usypia kartę | gra |
| Ekran zgaszony lub zablokowany | **milczy** — strona jest zamrożona | gra |
| Telefon wyłączony | milczy | gra (po włączeniu — push czeka w kolejce) |

Dlaczego dzwonek milczy przy zablokowanym ekranie? Bo przeglądarka wstrzymuje
wykonanie JavaScriptu, gdy strona jest w tle — nie ma wtedy kodu, który
zagrałby dźwięk. To ograniczenie platformy, nie błąd aplikacji. Dlatego
**powiadomienie systemowe jest jedynym pewnym alarmem przy zablokowanym
ekranie** — ono dociera do systemu, który działa niezależnie od aplikacji.

Dodatkowo opcja „Nie wygaszaj ekranu” (domyślnie włączona) sprawia, że telefon
**sam nie wygasza ekranu** w trakcie przerwy — wtedy strona w ogóle nie
zostaje zamrożona i dzwonek gra normalnie.

### Dzwonek a Twoja muzykka

Dzwonek odtwarzamy przez **Web Audio**, a nie przez element `<audio>`. To
istotna różnica:

| Sposób odtwarzania | Sesja audio | Efekt na muzykę |
|---|---|---|
| `<audio>` (element multimedialny) | `playback` — **wyłączna** | **pauzuje Spotify** na czas dźwięku |
| **Web Audio** (`AudioContext`) | `ambient` — miesza się | **muzyka gra dalej** |

Dodatkowo tam, gdzie przeglądarka zna Audio Session API (iOS 16.4+, Chrome
157+), ustawiamy sesję na **`transient`** — semantyka krótkiego
dźwięku-powiadomienia: wgrywa się na muzykę zamiast ją wstrzymywać.

Dzięki temu **dzwonek nie zabiera Ci muzyki** — ani na końcu przerwy, ani
(tym bardziej) przy każdym starcie timera.

Koszt tej decyzji: na iPhone dzwonek **nie zagra w trybie cichym**
(przełącznik boczny) i **nie zagra w tle** — obie rzeczy obsługuje
powiadomienie systemowe.

Jeśli przerwa skończy się, gdy aplikacja jest w tle, dzwonek **nie zadzwoni
przypadkiem później** (np. przy zaznaczaniu kolejnej serii). Oczekujące
odtworzenie wygasa po 2,5 s — a każda nowa przerwa je unieważnia. Dźwięk
rozlega się tylko wtedy, gdy zdążysz dotknąć ekranu tuż po zakończeniu
przerwy.

Dzwonek odtwarzamy **wyłącznie wtedy, gdy użytkownik naprawdę czekał** na
koniec przerwy (przerwa skończyła się przed chwilą, a aplikacja była na
wierzchu). Jeśli przerwa minęła, gdy telefon był zablokowany, jej alarmem
było **powiadomienie systemowe** — lokalny dzwonek tylko by przeszkadzał
przy powrocie do aplikacji.

Opóźnienie powiadomienia: **2–3 s** od końca przerwy (serwer budzi się w tle
i potrzebuje chwili na szyfrowanie oraz wysyłkę). Przy aplikacji na wierzchu
nie jest to zauważalne — dzwonek lokalny gra wtedy natychmiast.

## Ograniczenia (warto wiedzieć)

| Temat | Stan |
|---|---|
| Limit Edge Function | 150 s (plan darmowy) / 400 s (płatne) — przerwy dłuższe niż 2 min nie dostaną powiadomienia (dźwięk i ekran działają normalnie) |
| iPhone | powiadomienia wymagają dodania aplikacji do ekranu głównego i iOS 16.4+ |
| Tryb demo | powiadomienia wyłączone (brak konta = brak subskrypcji) |
| Zgoda | iOS wymaga prośby o zgodę przy geście użytkownika — stąd przycisk w ustawieniach |
| Bez internetu | push nie dotrze (dźwięk i ekran nadal działają) |

## Pliki

- `supabase/functions/rest-timer-push/index.ts` — funkcja (odbiera
  subskrypcje, planuje i wysyła powiadomienia)
- `SUPABASE_SETUP_PUSH.sql` — tabele i zasady RLS
- `public/sw.js` — service worker (pokazuje powiadomienie; **nie cache’uje**
  niczego, żeby aplikacja zawsze pobierała świeżą wersję)
- `src/lib/pushClient.ts` — klient (subskrypcja, planowanie, anulowanie)
- `src/lib/pushConfig.ts` — klucz publiczny i limity
