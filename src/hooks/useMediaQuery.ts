import { useEffect, useState } from 'react';

/**
 * Media query w React.
 *
 * Używane do zmiany układu (np. tracker serii: na telefonie komórka ma
 * tylko ~56 px, więc stepper pojawia się dopiero po dotknięciu wartości).
 *
 * SSR-safe: poza przeglądarką zwraca wartość domyślną.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return defaultValue;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Czy ekran jest wąski (telefon) — poniżej punktu przerwania `sm`. */
export function useIsNarrow(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
