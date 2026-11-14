export type MuscleGroup =
  | 'Klatka piersiowa'
  | 'Plecy'
  | 'Ramiona'
  | 'Biceps'
  | 'Triceps'
  | 'Nogi'
  | 'Barki'
  | 'Brzuch'
  | 'Cardio'
  | 'Całe ciało';

export type Difficulty = 'Początkujący' | 'Średniozaawansowany' | 'Zaawansowany';

export interface SetLog {
  id: string;
  setNumber: number;
  targetReps: string;   // planned reps e.g. "8-12"
  actualReps: number | null;
  weight: number | null;
  done: boolean;
  /** Kiedy seria została oznaczona jako wykonana (ms). Używane do
   *  ustalenia ostatnio zarejestrowanego treningu. */
  completedAt?: number;
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  difficulty: Difficulty;
  description: string;
  sets?: number;
  reps?: string;
  weight?: number;
  duration?: number; // in minutes for cardio
  restTime?: number; // in seconds
  notes?: string;
  requiredEquipment?: EquipmentItem[];
  setLogs?: SetLog[]; // per-set tracking
  /** Czy ćwiczenie wykonywane jest jednostronnie (np. jednorączowo/jednonóż).
   *  Wtedy serie rozdzielamy na Prawą i Lewą stronę na przemian. */
  isUnilateral?: boolean;
}

export interface WorkoutDay {
  id: string;
  dayIndex: number; // 0-6 (Mon-Sun)
  name: string;
  exercises: Exercise[];
  isRestDay: boolean;
  color: string;
}

export interface WeekPlan {
  id: string;
  name: string;
  days: WorkoutDay[];
  createdAt: Date;
}

export type View =
  | 'dashboard'
  | 'planner'
  | 'library'
  | 'stats'
  | 'generator'
  | 'shares'
  | 'templates'
  | 'favorites'
  | 'settings'
  | 'appearance'
  | 'timer'
  | 'help';

export type TrainingGoal = 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general_fitness';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentType = 'full_gym' | 'home_basic' | 'no_equipment' | 'dumbbells_only';
export type TrainingStyle = 'fbl' | 'push_pull_legs' | 'upper_lower' | 'full_body' | 'bro_split';

export type EquipmentItem =
  | 'bodyweight'
  | 'barbell'
  | 'dumbbells'
  | 'kettlebell'
  | 'pull_up_bar'
  | 'bench'
  | 'cable_machine'
  | 'leg_press'
  | 'leg_curl_machine'
  | 'smith_machine'
  | 'resistance_bands'
  | 'dip_bars'
  | 'treadmill'
  | 'stationary_bike'
  | 'rowing_machine'
  | 'elliptical'
  | 'battle_ropes'
  | 'jump_rope';

export interface GeneratorPreferences {
  goal: TrainingGoal;
  fitnessLevel: FitnessLevel;
  daysPerWeek: number;
  trainingDays: number[]; // 0=Pn, 1=Wt, 2=Śr, 3=Cz, 4=Pt, 5=Sb, 6=Nd
  equipment: EquipmentType;
  equipmentList: EquipmentItem[];
  trainingStyle: TrainingStyle;
  focusMuscles: string[];
  sessionDuration: number; // minutes
  includeCardio: boolean;
  includeWarmup: boolean;
}

export interface GeneratedPlan {
  id: string;
  name: string;
  description: string;
  goal: TrainingGoal;
  fitnessLevel: FitnessLevel;
  daysPerWeek: number;
  days: WorkoutDay[];
  createdAt: string;
  estimatedCalories: number;
  totalExercises: number;
  totalSets: number;
}

// ─── Udostępnianie dnia treningowego ────────────────────────────────────────

/** Status udostępnienia. `pending` → odbiorca musi zaakceptować albo odrzucić. */
export type ShareStatus = 'pending' | 'accepted' | 'declined';

/**
 * Migawka serii w udostępnionym dniu.
 *
 * Prywatna notatka `note` celowo NIE występuje w tym typie — jest usuwana
 * po stronie nadawcy, zanim dane opuszczą jego przeglądarkę.
 */
export interface SharedSetSnapshot {
  setNumber: number;
  targetReps: string;
  actualReps: number | null;
  weight: number | null;
}

/** Migawka ćwiczenia w udostępnionym dniu (bez `id` — nadaje je odbiorca). */
export interface SharedExerciseSnapshot {
  name: string;
  muscleGroup: MuscleGroup;
  difficulty: Difficulty;
  description: string;
  sets?: number;
  reps?: string;
  weight?: number;
  duration?: number;
  restTime?: number;
  requiredEquipment?: EquipmentItem[];
  setLogs: SharedSetSnapshot[];
}

/** Migawka całego dnia treningowego — trafia do kolumny `day_data`. */
export interface SharedDaySnapshot {
  exercises: SharedExerciseSnapshot[];
}

/**
 * Wiersz tabeli `shared_workouts` widziany przez RLS.
 *
 * Nadawca i odbiorca widzą ten sam typ — rozróżnia ich `owner_id`.
 */
export interface SharedWorkout {
  id: string;
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  recipient_email: string;
  week_key: string;
  day_index: number;
  day_name: string | null;
  day_data: SharedDaySnapshot;
  status: ShareStatus;
  accepted_at: string | null;
  accepted_week_key: string | null;
  accepted_day_index: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Workout Templates (Moje treningi) ──────────────────────────────────────────

/** Szablon treningu – nazwany zbiór ćwiczeń do wielokrotnego użycia. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];  // ćwiczenia bez setLogs (szablon)
  createdAt: string;
  updatedAt: string;
  /** Opcjonalny tag/kolor do grupowania */
  color?: string;
  /** Opcjonalny tag kategorii np. "Push", "Pull", "Legs", "Full Body" */
  category?: string;
  /** Czy użytkownik przypiął szablon — przypięte są zawsze na górze listy. */
  pinned?: boolean;
  /** ISO — kiedy szablon ostatnio zastosowano. */
  lastUsedAt?: string | null;
}

export const TEMPLATE_COLORS = [
  'bg-cyan-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500',
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500',
  'bg-red-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-slate-500',
  'bg-stone-500',
] as const;

/**
 * Gradienty kart szablonów — MAPA STATYCZNA, nie sklejane w runtime.
 *
 * Tailwind skanuje źródła po literalnych nazwach klas. Klasa zbudowana
 * w runtime (from- + kolor + -500) nigdy nie trafi do CSS, a szablon
 * dostawał pustą (lub przezroczystą) belkę nagłówka. Dlatego gradienty
 * są wypisane wprost — wtedy Tailwind na pewno je wygeneruje.
 */
export const TEMPLATE_GRADIENTS: Record<string, string> = {
  'bg-cyan-500': 'bg-gradient-to-r from-cyan-500 to-cyan-600',
  'bg-violet-500': 'bg-gradient-to-r from-violet-500 to-violet-600',
  'bg-indigo-500': 'bg-gradient-to-r from-indigo-500 to-indigo-600',
  'bg-blue-500': 'bg-gradient-to-r from-blue-500 to-blue-600',
  'bg-sky-500': 'bg-gradient-to-r from-sky-500 to-sky-600',
  'bg-emerald-500': 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  'bg-amber-500': 'bg-gradient-to-r from-amber-500 to-amber-600',
  'bg-orange-500': 'bg-gradient-to-r from-orange-500 to-orange-600',
  'bg-red-500': 'bg-gradient-to-r from-red-500 to-red-600',
  'bg-pink-500': 'bg-gradient-to-r from-pink-500 to-pink-600',
  'bg-fuchsia-500': 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600',
  'bg-slate-500': 'bg-gradient-to-r from-slate-500 to-slate-600',
  'bg-stone-500': 'bg-gradient-to-r from-stone-500 to-stone-600',
};

/** Gradient domyślny — gdy szablon nie ma koloru. */
export const TEMPLATE_GRADIENT_DEFAULT = 'bg-gradient-to-r from-cyan-500 to-cyan-600';

/** Gradient dla danego koloru (z bezpiecznym fallbackiem). */
export function templateGradient(color?: string | null): string {
  if (!color) return TEMPLATE_GRADIENT_DEFAULT;
  return TEMPLATE_GRADIENTS[color] ?? TEMPLATE_GRADIENT_DEFAULT;
}

/** Polskie nazwy kolorów — do opisów dostępnych dla czytników ekranu. */
export const TEMPLATE_COLOR_LABELS: Record<string, string> = {
  'bg-cyan-500': 'Cyjan',
  'bg-violet-500': 'Fiolet',
  'bg-indigo-500': 'Indygo',
  'bg-blue-500': 'Niebieski',
  'bg-sky-500': 'Jasnoniebieski',
  'bg-emerald-500': 'Szlachetna zieleń',
  'bg-amber-500': 'Bursztyn',
  'bg-orange-500': 'Pomarańcz',
  'bg-red-500': 'Czerwony',
  'bg-pink-500': 'Róż',
  'bg-fuchsia-500': 'Fiolet-magenta',
  'bg-slate-500': 'Szary',
  'bg-stone-500': 'Kamień',
};

export const TEMPLATE_CATEGORIES = [
  'Push', 'Pull', 'Nogi', 'Full Body', 'Upper', 'Lower',
  'Klatka', 'Plecy', 'Barki', 'Ramiona', 'Brzuch', 'Cardio',
  'Własne',
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

/**
 * Kategorie pogrupowane — filtr w widoku nie jest ścianą 13 chipów,
 * tylko trzema rzędami z sensownymi grupami.
 */
export const TEMPLATE_CATEGORY_GROUPS: { label: string; categories: TemplateCategory[] }[] = [
  {
    label: 'Podział treningu',
    categories: ['Push', 'Pull', 'Nogi', 'Full Body', 'Upper', 'Lower'],
  },
  {
    label: 'Partie ciała',
    categories: ['Klatka', 'Plecy', 'Barki', 'Ramiona', 'Brzuch'],
  },
  {
    label: 'Inne',
    categories: ['Cardio', 'Własne'],
  },
];

/** Domyślna kategoria nowego szablonu — musi istnieć w TEMPLATE_CATEGORIES. */
export const TEMPLATE_CATEGORY_DEFAULT: TemplateCategory = 'Własne';

/**
 * Normalizuje kategorię szablonu.
 *
 * Starsze szablony mają w bazie kategorię „Custom”, której nie ma na
 * liście filtrów — przez to znikały pod filtrem „Własne”. Traktujemy ją
 * jako „Własne”.
 */
export function normalizeTemplateCategory(category?: string | null): string {
  if (!category) return TEMPLATE_CATEGORY_DEFAULT;
  if (category === 'Custom' || category === 'custom') return TEMPLATE_CATEGORY_DEFAULT;
  return category;
}
