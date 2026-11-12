/**
 * Formatowanie tekstów i dat po polsku.
 *
 * Używane głównie w sekcji „Udostępnienia” (historie udostępnień), ale
 * pomocniki są ogólne — każdy komponent może z nich korzystać.
 */

/**
 * Polska odmiana liczebnika.
 *
 *   1  → forma pojedyncza   („1 udostępnienie”)
 *   2–4 → forma „mnoga bliska” („2 udostępnienia”, „4 udostępnienia")
 *   0, 5–21, 22–24 (bez 12–14) → forma „mnoga daleka" („5 udostępnień")
 *
 * Uwaga: 12–14 zawsze biorą formę dalszą („12 udostępnień", nie „12 udostępnienia").
 */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  const n10 = abs % 10;
  const n100 = abs % 100;

  if (abs === 1) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

/** „1 udostępnienie / 2 udostępnienia / 5 udostępnień” */
export function pluralShare(n: number): string {
  return pluralPl(n, 'udostępnienie', 'udostępnienia', 'udostępnień');
}

/** „1 ćwiczenie / 2 ćwiczenia / 5 ćwiczeń” */
export function pluralExercise(n: number): string {
  return pluralPl(n, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń');
}

/** „1 seria / 2 serie / 5 serii” */
export function pluralSet(n: number): string {
  return pluralPl(n, 'seria', 'serie', 'serii');
}

/** „1 trening / 2 treningi / 5 treningów” */
export function pluralWorkout(n: number): string {
  return pluralPl(n, 'trening', 'treningi', 'treningów');
}

/** Nazwy miesięcy (mianownik) — do nagłówków grup „Listopad 2026”. */
const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

/**
 * Nazwy miesięcy w dopełniaczu — do dat: „2 listopada”, „3 marca”.
 *
 * W mianowniku („2 listopad”) wygląda to jak literówka, a przy dacie
 * z miesiącem zawsze używamy formy „2 listopada”.
 */
const MONTH_NAMES_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

/**
 * Polskie nazwy sprzętu — klucze z bazy ćwiczeń są po angielsku
 * (np. „barbell”, „cable_machine”) i nie mają sensu w interfejsie.
 */
const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'sztanga',
  battle_ropes: 'baty zaczepowe',
  bench: 'ławka',
  bodyweight: 'ciężar ciała',
  cable_machine: 'wyciąg',
  dip_bars: 'poręcz dip',
  dumbbells: 'hantle',
  elliptical: 'orbitrek',
  jump_rope: 'skakanka',
  kettlebell: 'odważnik',
  leg_curl_machine: 'maszyna do odwodzenia nóg',
  leg_press_machine: 'prasa do nóg',
  leg_press: 'prasa do nóg',
  pull_up_bar: 'drabka',
  resistance_bands: 'taśmy oporowe',
  rowing_machine: 'rower',
  smith_machine: 'maszyna Smitha',
  stationary_bike: 'rower stacjonarny',
  treadmill: 'bieżnia',
};

/** Polska nazwa sprzętu (z fallbackiem do surowego klucza). */
export function equipmentLabel(key: string): string {
  return EQUIPMENT_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** Lista sprzętu po polsku — np. „hantle, ławka”. */
export function equipmentLabels(keys?: string[] | null): string {
  if (!keys || keys.length === 0) return '';
  return keys.map(equipmentLabel).join(', ');
}
/** Nazwy dni w skrócie (do wyboru dnia). */
export const WEEKDAYS_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So', 'Nd'];
/** Nazwy dni w skrócie z kropką — „Pon.” */
export const WEEKDAYS_SHORT_DOT = ['Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'So.', 'Nd.'];

/** „Listopad 2026” — nagłówek grupy miesięcznej. */
export function monthLabelPL(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** `2026-10-27` → `27.10.2026` */
export function formatDatePL(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** `Date` → `27.10.2026` */
export function formatDateObjPL(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

/** `Date` → `2026-10-27` (lokalna data, nigdy `toISOString` — to UTC). */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Względny czas („2 dni temu”) + pełna data jako `title`.
 *
 * Do 7 dni wstecz liczymy względnie, potem pokazujemy datę w bieżącym roku
 * („9 listopada”), a dla starszych — z rokiem („9 listopada 2025”).
 */
export function formatRelativePL(iso: string | null | undefined): { text: string; title: string } {
  if (!iso) return { text: '', title: '' };

  const d = new Date(iso);
  if (isNaN(d.getTime())) return { text: '', title: '' };

  const now = new Date();
  const title = `${formatDateObjPL(d)}`;

  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return { text: 'przed chwilą', title };
  if (diffMin < 60) return { text: `${diffMin} min temu`, title };

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return { text: `${diffHours} ${pluralPl(diffHours, 'godzina', 'godziny', 'godzin')} temu`, title };
  }

  // „wczoraj”
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) {
    return { text: 'wczoraj', title };
  }

  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 0 && diffDays < 7) {
    return { text: `${diffDays} ${pluralPl(diffDays, 'dzień', 'dni', 'dni')} temu`, title };
  }

  const month = MONTH_NAMES_GEN[d.getMonth()];
  if (d.getFullYear() === now.getFullYear()) {
    return { text: `${d.getDate()} ${month}`, title };
  }
  return { text: `${d.getDate()} ${month} ${d.getFullYear()}`, title };
}
