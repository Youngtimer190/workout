import { useEffect, useState } from 'react';
import { getCloudState, getCloudError, subscribeCloud, isNetworkError } from '../lib/cloudStatus';

interface CloudStatusBannerProps {
  /** Ponowienie synchronizacji (przycisk „Spróbuj ponownie”). */
  onRetry: () => void;
  /** Czy trwa właśnie ponawianie. */
  retrying?: boolean;
}

/**
 * Baner informujący, że chmura (Supabase) nie odpowiada.
 *
 * Bez niego użytkownik widział pusty plan i surowe błędy w konsoli, nie
 * wiedząc, że problem jest po stronie serwera, a nie w jego danych.
 */
export default function CloudStatusBanner({ onRetry, retrying }: CloudStatusBannerProps) {
  const [state, setState] = useState(getCloudState());
  const [error, setError] = useState(getCloudError());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => subscribeCloud((next, err) => {
    setState(next);
    setError(err);
    // Po powrocie chmury baner wraca (stan wraca do 'ok' → ukrywamy).
    if (next === 'ok') setDismissed(false);
  }), []);

  if (state !== 'failed' || dismissed) return null;

  // Surowy komunikat błędu pokazujemy TYLKO dla problemów sieciowych.
  // Błąd bazy (np. zła konfiguracja, brak uprawnień) ma inną przyczynę
  // i użytkownika interesuje wtedy informacja ogólna, nie komunikat
  // techniczny z serwera.
  const networkIssue = isNetworkError(error);

  return (
    <div
      role="status"
      className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-200">
            {networkIssue ? 'Chmura nie odpowiada' : 'Problem z chmurą'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-200/80">
            {networkIssue
              ? 'Dane z chmury są chwilowo niedostępne. Aplikacja działa na Twoich danych lokalnych — dane wrócą automatycznie, gdy połączenie się naprawi.'
              : 'Chmura zwróciła błąd podczas pobierania danych. Aplikacja działa na Twoich danych lokalnych.'}
            {networkIssue && error ? ` (${error})` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {retrying ? 'Łączę…' : 'Spróbuj ponownie'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Ukryj komunikat"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-200/70 transition-colors hover:bg-amber-400/10 hover:text-amber-100 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
