import { CircleHelpIcon, MailIcon } from '../icons';

interface HelpViewProps {
  onGoToSettings: () => void;
}

const FAQ = [
  {
    q: 'Jak dodać ćwiczenie do planu?',
    a: 'W zakładce „Planer” wybierz dzień, a następnie „Dodaj ćwiczenie”. Ćwiczenia dodane do planu można przesuwać w górę i w dół, a serie zaznaczać dotykając kolumn „Powt.” lub „Kg”.',
  },
  {
    q: 'Czy dane synchronizują się między urządzeniami?',
    a: 'Tak — po zalogowaniu konto Supabase przechowuje plany treningowe, szablony i własne ćwiczenia. Bez logowania aplikacja działa lokalnie (tryb offline) i dane zostają w przeglądarce.',
  },
  {
    q: 'Co to są „Szybki dostęp” w panelu bocznym?',
    a: '„Ulubione ćwiczenia” to skrót do ćwiczeń oznaczonych gwiazdką w bibliotece, a „Ostatnie treningi” — do zapisanych szablonów w zakładce „Moje treningi”.',
  },
  {
    q: 'Jak zmienić hasło lub dane konta?',
    a: 'Otwórz menu konta na dole panelu bocznego → „Ustawienia”. Tam zmienisz nazwę, hasło, a także usuniesz konto.',
  },
  {
    q: 'Co oznacza procent w karcie postępu?',
    a: 'To udział ukończonych serii w bieżącym tygodniu względem wszystkich zaplanowanych serii.',
  },
];

const SHORTCUTS = [
  ['Przełączanie zakładek', 'Kliknij pozycję w panelu bocznym'],
  ['Dodanie ćwiczenia', 'Planer → dzień → „Dodaj ćwiczenie”'],
  ['Zaznaczenie serii', 'Dotknij kolumny „Powt.” lub „Kg”'],
  ['Generowanie planu', 'Generator → 3 kroki → „Generuj plan”'],
  ['Udostępnienie dnia', 'Planer → dzień → ikona udostępniania'],
];

/**
 * Widok „Pomoc i wsparcie” — FAQ, skróty i kontakt.
 */
export default function HelpView({ onGoToSettings }: HelpViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <CircleHelpIcon className="h-6 w-6 text-violet-300" />
          Pomoc i wsparcie
        </h1>
        <p className="text-slate-400 text-sm mt-1">Najczęstsze pytania i skróty, które ułatwiają pracę</p>
      </div>

      {/* FAQ */}
      <section className="space-y-3">
        {FAQ.map(item => (
          <details
            key={item.q}
            className="group bg-white rounded-2xl border border-violet-400/15 px-5 py-4 transition-colors hover:border-violet-400/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              {item.q}
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-400 transition-transform group-open:rotate-90">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.a}</p>
          </details>
        ))}
      </section>

      {/* Skróty */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white mb-4">Skróty i najważniejsze akcje</h2>
        <dl className="space-y-3">
          {SHORTCUTS.map(([label, hint]) => (
            <div key={label} className="flex flex-col gap-1 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm font-semibold text-white">{label}</dt>
              <dd className="text-xs text-slate-400">{hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Kontakt */}
      <section className="bg-white rounded-2xl border border-violet-400/15 p-5">
        <h2 className="text-base font-bold text-white mb-2">Nie znalazłeś odpowiedzi?</h2>
        <p className="text-sm text-slate-400 mb-4">
          Napisz do nas — odpowiadamy zwykle w ciągu jednego dnia roboczego.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="mailto:kontakt@fitplanner.pl"
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition-all hover:bg-violet-500/20"
          >
            <MailIcon className="h-4 w-4" />
            kontakt@fitplanner.pl
          </a>
          <button
            onClick={onGoToSettings}
            className="text-sm text-slate-400 underline underline-offset-4 transition-colors hover:text-violet-300"
          >
            Albo sprawdź ustawienia konta
          </button>
        </div>
      </section>
    </div>
  );
}
