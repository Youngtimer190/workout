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
