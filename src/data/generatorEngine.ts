import {
  Exercise,
  WorkoutDay,
  GeneratorPreferences,
  GeneratedPlan,
  TrainingGoal,
  FitnessLevel,
  EquipmentItem,
  MuscleGroup,
} from '../types';
import { exerciseLibrary, dayColors } from './exercises';

const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// ─── Typy wewnętrzne ───────────────────────────────────────────────────────────

type ExerciseRole =
  | 'compound_primary'    // Fundamentalne ćwiczenia wielostawowe (squat, deadlift, bench, OHP, row)
  | 'compound_secondary'  // Ćwiczenia wielostawowe drugorzędne (dips, pull-up, split squat)
  | 'isolation_primary'   // Izolacje priorytetowe (lateral raise, curl, leg extension)
  | 'isolation_secondary' // Izolacje uzupełniające (kickback, concentration curl)
  | 'core'                // Ćwiczenia brzucha i stabilizacji
  | 'cardio'              // Cardio
  | 'warmup';             // Rozgrzewka

interface EnrichedExercise extends Exercise {
  role: ExerciseRole;
  priority: number; // 1–10, wyższy = lepszy bodziec treningowy
}

type SplitDay = {
  label: string;
  sessionType: 'strength' | 'hypertrophy' | 'mixed'; // typ sesji wpływa na dobór ćwiczeń
  muscles: MuscleGroup[];
  primaryMuscles: MuscleGroup[];    // główne partie — 2–4 ćwiczenia
  secondaryMuscles: MuscleGroup[];  // pomocnicze — 1–2 ćwiczenia
  avoidExerciseTypes?: string[];    // np. ['hip_dominant'] żeby nie powtarzać martwego ciągu 2 dni z rzędu
};

// ─── Klasyfikacja ćwiczeń — fundament systemu ─────────────────────────────────
// Priorytet odzwierciedla efektywność ćwiczenia dla danej kategorii
// Compounds primary: duże obciążenie CNS, największy potencjał wzrostu → priorytet 9–10
// Compounds secondary: mniejszy stres, ale duże zaangażowanie → priorytet 7–8
// Isolation primary: wysoka izolacja, progresja obciążenia → priorytet 4–6
// Isolation secondary: finiszery, pompowanie → priorytet 2–3

const EXERCISE_CLASSIFICATION: Record<string, { role: ExerciseRole; priority: number }> = {
  // ── KLATKA PIERSIOWA ──
  'Wyciskanie sztangi leżąc':                      { role: 'compound_primary',    priority: 10 },
  'Wyciskanie skośne sztangą (górna klatka)':       { role: 'compound_primary',    priority: 9  },
  'Wyciskanie hantli leżąc':                        { role: 'compound_secondary',  priority: 8  },
  'Wyciskanie skośne hantlami (górna klatka)':      { role: 'compound_secondary',  priority: 7  },
  'Pompki na poręczach (klatka)':                   { role: 'compound_secondary',  priority: 7  },
  'Wyciskanie dolne hantlami (ujemny kąt ławki)':   { role: 'compound_secondary',  priority: 6  },
  'Wyciskanie maszyna (Hammer Strength)':           { role: 'compound_secondary',  priority: 6  },
  'Rozpiętki z hantlami na ławce poziomej':         { role: 'isolation_primary',   priority: 6  },
  'Rozpiętki skośne (górna klatka)':                { role: 'isolation_primary',   priority: 5  },
  'Krzyżowanie linek (wyciąg górny)':               { role: 'isolation_primary',   priority: 5  },
  'Krzyżowanie linek dolnych (wyciąg dolny)':       { role: 'isolation_primary',   priority: 5  },
  'Rozpiętki jednorącz na wyciągu górnym':          { role: 'isolation_primary',   priority: 5  },
  'Rozpiętki jednorącz na wyciągu dolnym':          { role: 'isolation_primary',   priority: 5  },
  'Rozpiętki na wyciągu środkowym (cable fly)':     { role: 'isolation_primary',   priority: 5  },
  'Pompki':                                         { role: 'compound_secondary',  priority: 5  },
  'Pompki na podwyższeniu (górna klatka)':          { role: 'compound_secondary',  priority: 4  },
  'Pompki diamentowe':                              { role: 'isolation_secondary', priority: 3  },
  'Pompki szerokim chwytem':                        { role: 'compound_secondary',  priority: 4  },
  'Svend Press (ściskanie talerzy)':                { role: 'isolation_secondary', priority: 3  },
  'Wyciskanie decline ze sztangą (dolna klatka)':   { role: 'compound_primary',    priority: 8  },

  // ── PLECY ──
  'Martwy ciąg konwencjonalny':                     { role: 'compound_primary',    priority: 10 },
  'Martwy ciąg rumuński (RDL)':                     { role: 'compound_primary',    priority: 9  },
  'Podciąganie na drążku (szerokim chwytem)':       { role: 'compound_primary',    priority: 9  },
  'Wiosłowanie sztangą w opadzie tułowia':          { role: 'compound_primary',    priority: 9  },
  'Podciąganie neutralnym chwytem':                 { role: 'compound_secondary',  priority: 8  },
  'Chin-up (podciąganie podchwytem)':               { role: 'compound_secondary',  priority: 8  },
  'Wiosłowanie hantlem jednoręczne':                { role: 'compound_secondary',  priority: 8  },
  'Wiosłowanie T-bar':                              { role: 'compound_secondary',  priority: 7  },
  'Good Morning ze sztangą':                        { role: 'compound_secondary',  priority: 6  },
  'Inwertowane wiosłowanie (Australian pull-up)':   { role: 'compound_secondary',  priority: 6  },
  'Wiosłowanie na wyciągu dolnym (siedzisko)':      { role: 'isolation_primary',   priority: 6  },
  'Ściąganie drążka na wyciągu górnym (lat pulldown)': { role: 'isolation_primary', priority: 6 },
  'Ściąganie liny na wyciągu górnym':               { role: 'isolation_primary',   priority: 5  },
  'Ściąganie jednorącz na wyciągu':                 { role: 'isolation_primary',   priority: 5  },
  'Wiosłowanie jednorącz na wyciągu dolnym':        { role: 'isolation_primary',   priority: 5  },
  'Wiosłowanie maszyna (Hammer Strength)':          { role: 'isolation_primary',   priority: 5  },
  'Wiosłowanie z gumą oporową':                     { role: 'isolation_secondary', priority: 4  },
  'Face pull z gumą oporową':                       { role: 'isolation_secondary', priority: 3  },
  'Ściąganie ramion (shrugs) ze sztangą':           { role: 'isolation_primary',   priority: 5  },
  'Shrugs z hantlami':                              { role: 'isolation_secondary', priority: 4  },
  'Hyperextension (prostowanie pleców)':            { role: 'isolation_primary',   priority: 5  },
  'Martwy ciąg z hantlami':                         { role: 'compound_secondary',  priority: 6  },
  'Pullover z hantlem (plecy)':                     { role: 'isolation_primary',   priority: 5  },
  'Wiosłowanie szerokim chwytem':                   { role: 'compound_secondary',  priority: 7  },

  // ── NOGI ──
  'Przysiad ze sztangą (back squat)':               { role: 'compound_primary',    priority: 10 },
  'Hip Thrust ze sztangą':                          { role: 'compound_primary',    priority: 9  },
  'Martwy ciąg rumuński z hantlami (RDL)':          { role: 'compound_primary',    priority: 8  },
  'Przysiady bułgarskie (Bulgarian Split Squat)':   { role: 'compound_primary',    priority: 9  },
  'Przysiad przedni (front squat)':                 { role: 'compound_primary',    priority: 8  },
  'Sumo deadlift (szeroki chwyt)':                  { role: 'compound_primary',    priority: 8  },
  'Przysiad sumo ze sztangą':                       { role: 'compound_secondary',  priority: 7  },
  'Prasa do nóg':                                   { role: 'compound_secondary',  priority: 7  },
  'Wykroki chodzące z hantlami':                    { role: 'compound_secondary',  priority: 7  },
  'Wykroki z hantlami w miejscu':                   { role: 'compound_secondary',  priority: 6  },
  'Martwy ciąg sumo z hantlami':                    { role: 'compound_secondary',  priority: 7  },
  'Krok w górę na skrzynię (step-up)':              { role: 'compound_secondary',  priority: 6  },
  'Przysiad z hantlami (goblet squat)':             { role: 'compound_secondary',  priority: 6  },
  'Hip Thrust jednostronny z hantlem':              { role: 'compound_secondary',  priority: 6  },
  'Hip Thrust z gumą oporową':                      { role: 'compound_secondary',  priority: 5  },
  'Żuraw jednonóż (single leg deadlift)':           { role: 'compound_secondary',  priority: 6  },
  'Przysiad na jednej nodze (pistol squat)':        { role: 'compound_secondary',  priority: 7  },
  'Nordic Curl (uginanie nóg z partnerem)':         { role: 'isolation_primary',   priority: 6  },
  'Uginanie nóg leżąc (leg curl)':                  { role: 'isolation_primary',   priority: 6  },
  'Prostowanie nóg na maszynie (leg extension)':    { role: 'isolation_primary',   priority: 6  },
  'Wspięcia na palce ze sztangą (łydki)':           { role: 'isolation_primary',   priority: 5  },
  'Wspięcia na palce siedząc (maszyna)':            { role: 'isolation_primary',   priority: 5  },
  'Wspięcia na palce jednonóż':                     { role: 'isolation_secondary', priority: 4  },
  'Abdukcja bioder na maszynie':                    { role: 'isolation_secondary', priority: 4  },
  'Boczne kroki z gumą (band walk)':               { role: 'isolation_secondary', priority: 3  },
  'Przysiad z masą ciała':                          { role: 'compound_secondary',  priority: 4  },
  'Przysiad boczny (lateral squat)':                { role: 'isolation_secondary', priority: 4  },

  // ── BARKI ──
  'Wyciskanie żołnierskie (OHP) ze sztangą':        { role: 'compound_primary',    priority: 10 },
  'Wyciskanie hantli nad głowę (siedząc)':          { role: 'compound_secondary',  priority: 8  },
  'Wyciskanie żołnierskie hantlami stojąc':         { role: 'compound_secondary',  priority: 8  },
  'Arnoldpress z hantlami':                         { role: 'compound_secondary',  priority: 7  },
  'Press z hantlami stojąc (push press)':           { role: 'compound_secondary',  priority: 7  },
  'Press za głowę (behind neck press)':             { role: 'compound_secondary',  priority: 6  },
  'Wyciskanie na wyciągu (cable shoulder press)':   { role: 'compound_secondary',  priority: 6  },
  'Unoszenie hantli bokiem (lateral raise)':        { role: 'isolation_primary',   priority: 7  },
  'Wznosy hantli na wyciągu bocznym (cable lateral)': { role: 'isolation_primary', priority: 7 },
  'Unoszenie hantli bokiem w opadzie (tylny bark)': { role: 'isolation_primary',   priority: 6  },
  'Odwrotne rozpiętki na maszynie (pec deck odwrotny)': { role: 'isolation_primary', priority: 6 },
  'Face Pulls na wyciągu':                          { role: 'isolation_primary',   priority: 6  },
  'Wznosy hantli przodem':                          { role: 'isolation_secondary', priority: 4  },
  'Wznosy ramion z gumą oporową':                   { role: 'isolation_secondary', priority: 3  },
  'Upright Row (wiosłowanie stojąc)':               { role: 'isolation_primary',   priority: 5  },
  'Wznosy hantli 3 drogi (front/lateral/rear)':     { role: 'isolation_secondary', priority: 4  },
  'Rotacje zewnętrzne z gumą (external rotation)':  { role: 'isolation_secondary', priority: 3  },
  'Pompki odwrócone (Pike Push-Up)':                { role: 'compound_secondary',  priority: 5  },

  // ── BICEPS ──
  'Uginanie ramion ze sztangą stojąc':              { role: 'compound_secondary',  priority: 8  },
  'Uginanie EZ-bar (łamana sztanga)':               { role: 'compound_secondary',  priority: 8  },
  'Uginanie naprzemienne z hantlami':               { role: 'isolation_primary',   priority: 7  },
  'Uginanie młotkowe (hammer curl)':                { role: 'isolation_primary',   priority: 7  },
  'Uginanie ramion na modlitewniku (preacher curl)': { role: 'isolation_primary',  priority: 6  },
  'Uginanie Spiderman (na skosie twarzą w dół)':    { role: 'isolation_primary',   priority: 6  },
  'Uginanie z hantlami na skosie (incline dumbbell curl)': { role: 'isolation_primary', priority: 6 },
  'Uginanie na wyciągu dolnym':                     { role: 'isolation_primary',   priority: 5  },
  'Wiosłowanie podchwytem (supinated row)':         { role: 'compound_secondary',  priority: 7  },
  'Uginanie koncentryczne (concentration curl)':    { role: 'isolation_secondary', priority: 4  },
  'Uginanie ze sztangą chwytem odwróconym (reverse curl)': { role: 'isolation_secondary', priority: 4 },
  'Uginanie cable z liną (drag curl)':              { role: 'isolation_secondary', priority: 4  },
  'Uginanie ramion na wyciągu górnym (overhead curl)': { role: 'isolation_secondary', priority: 4 },
  'Uginanie ramion z gumą oporową':                 { role: 'isolation_secondary', priority: 3  },

  // ── TRICEPS ──
  'Wyciskanie wąskim chwytem':                      { role: 'compound_primary',    priority: 9  },
  'Dipy na poręczach (wąskie, triceps)':            { role: 'compound_primary',    priority: 8  },
  'JM Press':                                       { role: 'compound_secondary',  priority: 7  },
  'French press (łamanie) ze sztangą leżąc':        { role: 'compound_secondary',  priority: 7  },
  'EZ-bar French press stojąc':                     { role: 'compound_secondary',  priority: 7  },
  'Wyciskanie Tate Press (pająk)':                  { role: 'compound_secondary',  priority: 6  },
  'Prostowanie ramion na wyciągu (pushdown)':       { role: 'isolation_primary',   priority: 6  },
  'Prostowanie ramion z liną (rope pushdown)':      { role: 'isolation_primary',   priority: 6  },
  'Prostowanie ramion z hantlem nad głową':         { role: 'isolation_primary',   priority: 6  },
  'Prostowanie ramienia na wyciągu górnym (overhead cable)': { role: 'isolation_primary', priority: 6 },
  'Prostowanie ramion za głowę z liną (overhead rope)': { role: 'isolation_primary', priority: 5 },
  'Pompki od krzesła (bench dips)':                 { role: 'isolation_secondary', priority: 4  },
  'Kickback z hantlem w opadzie':                   { role: 'isolation_secondary', priority: 3  },
  'Pompki wąskim chwytem':                          { role: 'isolation_secondary', priority: 4  },
  'Prostowanie ramion z gumą':                      { role: 'isolation_secondary', priority: 3  },
};

function classifyExercise(exercise: Exercise): EnrichedExercise {
  if (exercise.muscleGroup === 'Cardio') {
    return { ...exercise, role: 'cardio', priority: 1 };
  }
  if (exercise.muscleGroup === 'Brzuch') {
    // Hierarchia core: zaawansowane ćwiczenia z oporem wyżej
    if (['Ab Wheel Rollout', 'Dragon Flag', 'Allahy (skłony na kolanach z linką wyciągu)', 'Allahy z rotacją (skłony skośne na wyciągu)', 'Unoszenie nóg w zwisie', 'Crunch na maszynie (cable crunch)', 'Pallof Press (anty-rotacja)', 'Wiosłowanie hantlem z rotacją (renegade row)'].includes(exercise.name)) {
      return { ...exercise, role: 'core', priority: 6 };
    }
    if (['Hollow Body Hold', 'V-up (składanka)', 'Russian Twist z ciężarem', 'Dead Bug', 'Boczny plank (side plank)', 'Plank z dotknięciem barku', 'Unoszenie kolan w zwisie', 'Leg Raise leżąc', 'Windshield Wipers', 'Żuraw (toe touch crunch)'].includes(exercise.name)) {
      return { ...exercise, role: 'core', priority: 5 };
    }
    return { ...exercise, role: 'core', priority: 4 };
  }

  const classification = EXERCISE_CLASSIFICATION[exercise.name];
  if (classification) {
    return { ...exercise, ...classification };
  }

  // Fallback dla nieznanych ćwiczeń
  if (exercise.muscleGroup === 'Całe ciało') {
    return { ...exercise, role: 'compound_primary', priority: 7 };
  }
  return { ...exercise, role: 'isolation_primary', priority: 4 };
}

// ─── Losowość z wagami (weighted shuffle) ─────────────────────────────────────

function weightedShuffle<T extends { priority: number }>(arr: T[]): T[] {
  if (arr.length === 0) return [];
  const result: T[] = [];
  const pool = [...arr];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((s, e) => s + Math.pow(e.priority, 2), 0);
    let rand = Math.random() * totalWeight;
    let chosen = 0;
    for (let i = 0; i < pool.length; i++) {
      rand -= Math.pow(pool[i].priority, 2);
      if (rand <= 0) { chosen = i; break; }
    }
    result.push(pool[chosen]);
    pool.splice(chosen, 1);
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Filtrowanie po sprzęcie ───────────────────────────────────────────────────

function filterByEquipment(exercises: Exercise[], equipmentList: EquipmentItem[]): Exercise[] {
  const available = new Set<EquipmentItem>([...equipmentList, 'bodyweight']);
  return exercises.filter(ex => {
    if (!ex.requiredEquipment || ex.requiredEquipment.length === 0) return true;
    return ex.requiredEquipment.every(eq => available.has(eq));
  });
}

// ─── Filtrowanie po poziomie zaawansowania ────────────────────────────────────

function filterByLevel(exercises: Exercise[], level: FitnessLevel): Exercise[] {
  if (level === 'beginner') {
    return exercises.filter(e => e.difficulty !== 'Zaawansowany');
  }
  return exercises;
}

// ─── Parametry serii/powtórzeń/przerw per cel i poziom ───────────────────────
// Oparte na aktualnej literaturze naukowej (Schoenfeld, Krieger, Israetel)

interface VolumeParams {
  // Ćwiczenia compound (primary)
  setsCompoundPrimary: number;
  repsCompoundPrimary: string;
  restCompoundPrimary: number;
  // Ćwiczenia compound (secondary)
  setsCompoundSecondary: number;
  repsCompoundSecondary: string;
  restCompoundSecondary: number;
  // Izolacje
  setsIsolation: number;
  repsIsolation: string;
  restIsolation: number;
  // Core
  setsCore: number;
  repsCore: string;
  // Wskazówki trenera
  trainerNoteCompound: string;
  trainerNoteIsolation: string;
}

function getVolumeParams(goal: TrainingGoal, level: FitnessLevel): VolumeParams {
  const isAdv = level === 'advanced';
  const isBeg = level === 'beginner';

  switch (goal) {
    case 'strength':
      return {
        setsCompoundPrimary:    isAdv ? 5 : isBeg ? 3 : 4,
        repsCompoundPrimary:    isAdv ? '3-5' : isBeg ? '5-6' : '4-6',
        restCompoundPrimary:    isAdv ? 300 : 240,
        setsCompoundSecondary:  isAdv ? 4 : 3,
        repsCompoundSecondary:  '5-8',
        restCompoundSecondary:  180,
        setsIsolation:          2,
        repsIsolation:          '8-10',
        restIsolation:          120,
        setsCore:               3,
        repsCore:               '8-12',
        trainerNoteCompound:    '⚡ SIŁA: Pełna regeneracja CNS między seriami — nie skracaj przerw. Ekscentryka 3–4 sek, koncentryka maksymalnie eksplozywna. Gdy nie możesz utrzymać techniki — zakończ serię.',
        trainerNoteIsolation:   '⚡ SIŁA: Izolacje jako profilaktyka — nie do upadku. Utrzymaj technikę, zamiast zwiększać ciężar.',
      };

    case 'muscle_gain':
      return {
        setsCompoundPrimary:    isAdv ? 5 : isBeg ? 3 : 4,
        repsCompoundPrimary:    isAdv ? '6-10' : isBeg ? '10-12' : '8-12',
        restCompoundPrimary:    isAdv ? 150 : 120,
        setsCompoundSecondary:  isAdv ? 4 : 3,
        repsCompoundSecondary:  isAdv ? '8-12' : '10-15',
        restCompoundSecondary:  90,
        setsIsolation:          isAdv ? 4 : 3,
        repsIsolation:          '12-15',
        restIsolation:          60,
        setsCore:               3,
        repsCore:               '15-20',
        trainerNoteCompound:    '💪 HIPERTROFIA: Ekscentryka 2–3 sek. Ostatnia seria do technicznego upadku (nie bólowego). Zwiększ ciężar gdy robisz górny zakres we WSZYSTKICH seriach. Mechanic drop set gdy dostępny partner.',
        trainerNoteIsolation:   '💪 HIPERTROFIA: Poczuj mięsień — mind-muscle connection. Szczyt zacisku 1 sek. Powolna ekscentryka. Krew w mięśniu to znak dobrego treningu.',
      };

    case 'fat_loss':
      return {
        setsCompoundPrimary:    isBeg ? 3 : 4,
        repsCompoundPrimary:    '10-15',
        restCompoundPrimary:    75,
        setsCompoundSecondary:  3,
        repsCompoundSecondary:  '12-15',
        restCompoundSecondary:  60,
        setsIsolation:          3,
        repsIsolation:          '15-20',
        restIsolation:          45,
        setsCore:               3,
        repsCore:               '20-25',
        trainerNoteCompound:    '🔥 REDUKCJA: Krótkie przerwy utrzymują metabolizm na wysokim poziomie. Ciągłe napięcie — bez odpoczynku w górnym/dolnym punkcie. Supersety antagonistów tam gdzie możliwe (klatka+plecy, biceps+triceps).',
        trainerNoteIsolation:   '🔥 REDUKCJA: Wysoka objętość, niskie przerwy. Drop sets na ostatniej serii. Mięśnie zachowane = więcej spalanych kalorii 24/7.',
      };

    case 'endurance':
      return {
        setsCompoundPrimary:    isBeg ? 2 : 3,
        repsCompoundPrimary:    '15-20',
        restCompoundPrimary:    60,
        setsCompoundSecondary:  3,
        repsCompoundSecondary:  '20-25',
        restCompoundSecondary:  45,
        setsIsolation:          2,
        repsIsolation:          '20-30',
        restIsolation:          30,
        setsCore:               4,
        repsCore:               '25-40 sek',
        trainerNoteCompound:    '🏃 WYTRZYMAŁOŚĆ: Ciągłe tempo przez cały zakres powtórzeń — bez zatrzymywania. Oddychaj rytmicznie. Cel to adaptacja metaboliczna, nie maksymalna siła. Nawodnienie kluczowe.',
        trainerNoteIsolation:   '🏃 WYTRZYMAŁOŚĆ: Minimalne przerwy między ćwiczeniami — obwód gdy możliwe. Mięśnie muszą tolerować zakwasy i kontynuować pracę.',
      };

    case 'general_fitness':
    default:
      return {
        setsCompoundPrimary:    isBeg ? 3 : isAdv ? 4 : 3,
        repsCompoundPrimary:    isBeg ? '10-12' : '8-12',
        restCompoundPrimary:    90,
        setsCompoundSecondary:  3,
        repsCompoundSecondary:  '10-15',
        restCompoundSecondary:  75,
        setsIsolation:          3,
        repsIsolation:          '12-15',
        restIsolation:          60,
        setsCore:               3,
        repsCore:               '15-20',
        trainerNoteCompound:    '⚡ SPRAWNOŚĆ: Technika ponad ciężar — zawsze. Pełen zakres ruchu. Stopniowo zwiększaj obciążenie gdy ćwiczenie staje się komfortowe.',
        trainerNoteIsolation:   '⚡ SPRAWNOŚĆ: Skup się na czuciu mięśnia, nie na poruszaniu ciężaru. Kontrolowane tempo w obie strony.',
      };
  }
}

// ─── Definicje podziałów treningowych ─────────────────────────────────────────
// Każdy split jest zaprojektowany przez trenera z uwzględnieniem:
// - Minimalnego czasu regeneracji między sesjami tej samej partii
// - Balans między objętością a częstotliwością
// - Synergia mięśni (mięśnie pomocnicze z ćwiczeń compound)

function getSplit(style: string, daysPerWeek: number, level: FitnessLevel): SplitDay[] {

  // ── FULL BODY ──────────────────────────────────────────────────────────────
  // Optymalne dla: początkujących i średniozaawansowanych
  // Każda partia 2–3x/tydzień = wysoka częstotliwość = szybsza nauka techniki
  // Warianty A/B/C rotują ćwiczenia dla różnorodności bodźca
  if (style === 'full_body') {
    const variations: SplitDay[] = [
      {
        label: 'Full Body A — Quad & Push Dominant',
        sessionType: 'mixed',
        muscles: ['Klatka piersiowa', 'Plecy', 'Nogi', 'Barki', 'Triceps', 'Brzuch'],
        primaryMuscles: ['Klatka piersiowa', 'Nogi', 'Plecy'],
        secondaryMuscles: ['Barki', 'Triceps', 'Brzuch'],
      },
      {
        label: 'Full Body B — Hip & Pull Dominant',
        sessionType: 'mixed',
        muscles: ['Plecy', 'Nogi', 'Klatka piersiowa', 'Biceps', 'Barki', 'Brzuch'],
        primaryMuscles: ['Plecy', 'Nogi', 'Klatka piersiowa'],
        secondaryMuscles: ['Biceps', 'Barki', 'Brzuch'],
      },
      {
        label: 'Full Body C — Hinge & Shoulder Dominant',
        sessionType: 'mixed',
        muscles: ['Nogi', 'Barki', 'Plecy', 'Klatka piersiowa', 'Brzuch'],
        primaryMuscles: ['Nogi', 'Barki', 'Plecy'],
        secondaryMuscles: ['Klatka piersiowa', 'Brzuch'],
      },
    ];
    return Array.from({ length: daysPerWeek }, (_, i) => variations[i % variations.length]);
  }

  // ── UPPER / LOWER ──────────────────────────────────────────────────────────
  // Optymalne dla: 4 dni, świetna częstotliwość 2x/partię
  // Upper A: nacisk na pchanie (bench press dominant)
  // Upper B: nacisk na ciągnięcie (row dominant)
  // Lower A: quad dominant (squat pattern)
  // Lower B: hip dominant (hinge pattern)
  if (style === 'upper_lower') {
    const upper_A: SplitDay = {
      label: 'Góra A — Push Dominant (Klatka, Barki, Triceps)',
      sessionType: 'mixed',
      muscles: ['Klatka piersiowa', 'Barki', 'Triceps', 'Plecy'],
      primaryMuscles: ['Klatka piersiowa', 'Barki'],
      secondaryMuscles: ['Triceps', 'Plecy'],
    };
    const upper_B: SplitDay = {
      label: 'Góra B — Pull Dominant (Plecy, Biceps)',
      sessionType: 'mixed',
      muscles: ['Plecy', 'Biceps', 'Barki', 'Klatka piersiowa'],
      primaryMuscles: ['Plecy', 'Biceps'],
      secondaryMuscles: ['Barki', 'Klatka piersiowa'],
    };
    const lower_A: SplitDay = {
      label: 'Dół A — Quad Dominant (Czworogłowe, Pośladki)',
      sessionType: 'mixed',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
      avoidExerciseTypes: ['hip_hinge'],
    };
    const lower_B: SplitDay = {
      label: 'Dół B — Hip Dominant (Dwugłowe, Pośladki)',
      sessionType: 'mixed',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
    };

    if (daysPerWeek === 2) return [upper_A, lower_A];
    if (daysPerWeek === 3) return [upper_A, lower_A, upper_B];
    const pattern = [upper_A, lower_A, upper_B, lower_B];
    return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % pattern.length]);
  }

  // ── PUSH / PULL / LEGS ─────────────────────────────────────────────────────
  // Optymalne dla: 3–6 dni, dobra specjalizacja
  // Klasyczny split z naturalną synergia mięśni
  // Przy 6 dniach: PPL PPL (każda partia 2x/tydzień)
  if (style === 'push_pull_legs') {
    const push: SplitDay = {
      label: 'Push — Pchanie (Klatka, Barki, Triceps)',
      sessionType: 'mixed',
      muscles: ['Klatka piersiowa', 'Barki', 'Triceps'],
      primaryMuscles: ['Klatka piersiowa', 'Barki'],
      secondaryMuscles: ['Triceps'],
    };
    const pull: SplitDay = {
      label: 'Pull — Ciągnięcie (Plecy, Biceps, Tylny Bark)',
      sessionType: 'mixed',
      muscles: ['Plecy', 'Biceps', 'Barki'],
      primaryMuscles: ['Plecy', 'Biceps'],
      secondaryMuscles: ['Barki'],
    };
    const legs: SplitDay = {
      label: 'Legs — Nogi (Czworogłowe, Pośladki, Dwugłowe, Łydki)',
      sessionType: 'mixed',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
    };
    const pattern = [push, pull, legs];
    return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % pattern.length]);
  }

  // ── BRO SPLIT ──────────────────────────────────────────────────────────────
  // Optymalne dla: izolacja i wysoka objętość per partię, 5 dni
  // Każda partia 1x/tydzień = duża objętość na sesję
  if (style === 'bro_split') {
    const days: SplitDay[] = [
      {
        label: 'Klatka piersiowa (+ Triceps pomocniczo)',
        sessionType: level === 'advanced' ? 'hypertrophy' : 'mixed',
        muscles: ['Klatka piersiowa', 'Triceps'],
        primaryMuscles: ['Klatka piersiowa'],
        secondaryMuscles: ['Triceps'],
      },
      {
        label: 'Plecy (+ Biceps pomocniczo)',
        sessionType: level === 'advanced' ? 'hypertrophy' : 'mixed',
        muscles: ['Plecy', 'Biceps'],
        primaryMuscles: ['Plecy'],
        secondaryMuscles: ['Biceps'],
      },
      {
        label: 'Nogi — kompletny trening dolnych partii',
        sessionType: level === 'advanced' ? 'hypertrophy' : 'mixed',
        muscles: ['Nogi', 'Brzuch'],
        primaryMuscles: ['Nogi'],
        secondaryMuscles: ['Brzuch'],
      },
      {
        label: 'Barki (+ Triceps uzupełniająco)',
        sessionType: level === 'advanced' ? 'hypertrophy' : 'mixed',
        muscles: ['Barki', 'Triceps'],
        primaryMuscles: ['Barki'],
        secondaryMuscles: ['Triceps'],
      },
      {
        label: 'Ramiona — Biceps & Triceps (+ Core)',
        sessionType: level === 'advanced' ? 'hypertrophy' : 'mixed',
        muscles: ['Biceps', 'Triceps', 'Brzuch'],
        primaryMuscles: ['Biceps', 'Triceps'],
        secondaryMuscles: ['Brzuch'],
      },
    ];
    return Array.from({ length: daysPerWeek }, (_, i) => days[i % days.length]);
  }

  // ── FBL SPLIT (Frequency-Based) ────────────────────────────────────────────
  // Optymalne dla: zaawansowani, 5+ dni, wymagają wysokiej częstotliwości
  // Miks: sesje siłowe + hipertroficzne dla tej samej partii w tygodniu
  const fbl: SplitDay[] = [
    {
      label: 'Klatka & Triceps — Siłowy (compound focused)',
      sessionType: 'strength',
      muscles: ['Klatka piersiowa', 'Triceps', 'Brzuch'],
      primaryMuscles: ['Klatka piersiowa'],
      secondaryMuscles: ['Triceps', 'Brzuch'],
    },
    {
      label: 'Plecy & Biceps — Siłowy (vertical + horizontal pull)',
      sessionType: 'strength',
      muscles: ['Plecy', 'Biceps'],
      primaryMuscles: ['Plecy'],
      secondaryMuscles: ['Biceps'],
    },
    {
      label: 'Nogi & Barki — Kompletny',
      sessionType: 'mixed',
      muscles: ['Nogi', 'Barki', 'Brzuch'],
      primaryMuscles: ['Nogi', 'Barki'],
      secondaryMuscles: ['Brzuch'],
    },
    {
      label: 'Klatka & Plecy — Hipertroficzny (pump session)',
      sessionType: 'hypertrophy',
      muscles: ['Klatka piersiowa', 'Plecy', 'Brzuch'],
      primaryMuscles: ['Klatka piersiowa', 'Plecy'],
      secondaryMuscles: ['Brzuch'],
    },
    {
      label: 'Ramiona & Core — Izolacja (specialization)',
      sessionType: 'hypertrophy',
      muscles: ['Biceps', 'Triceps', 'Barki', 'Brzuch'],
      primaryMuscles: ['Biceps', 'Triceps', 'Barki'],
      secondaryMuscles: ['Brzuch'],
    },
  ];
  return Array.from({ length: daysPerWeek }, (_, i) => fbl[i % fbl.length]);
}

// ─── Optymalny rozkład dni w tygodniu ────────────────────────────────────────
// Zasada: minimum 1 dzień odpoczynku między ciężkimi sesjami tej samej partii

function assignDayIndices(daysPerWeek: number): number[] {
  const schedules: Record<number, number[]> = {
    2: [1, 4],              // Wt, Pt — max odpoczynek między sesjami
    3: [0, 2, 4],           // Pn, Śr, Pt — klasyka 3×/tydzień
    4: [0, 1, 3, 4],        // Pn, Wt, Cz, Pt — 2 dni + odpoczynek + 2 dni
    5: [0, 1, 2, 4, 5],     // Pn-Śr + Pt-Sb — środa = przełom
    6: [0, 1, 2, 3, 4, 5],  // Pn-Sb
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return schedules[daysPerWeek] || schedules[3];
}

// ─── Specyficzne rozgrzewki dla każdej partii ────────────────────────────────
// Profesjonalna rozgrzewka aktywuje mięśnie, poprawia zakres ruchu i zapobiega kontuzjom

function buildWarmup(splitDay: SplitDay, dayIndex: number, equipmentList: EquipmentItem[]): Exercise {
  const primaryMuscle = splitDay.primaryMuscles[0];

  // Dynamiczny dobór cardio do rozgrzewki na podstawie dostępnego sprzętu
  const hasBike   = equipmentList.includes('stationary_bike');
  const hasRower  = equipmentList.includes('rowing_machine');
  const hasTread  = equipmentList.includes('treadmill');
  const hasBands  = equipmentList.includes('resistance_bands');

  // Wybierz najlepsze dostępne cardio do rozgrzewki
  const cardioWarmup =
    hasBike  ? 'rower stacjonarny (60–70 rpm, opór 2–3)' :
    hasRower ? 'ergometr wioślarski (spokojne tempo, ~20 spm)' :
    hasTread ? 'marsz/trucht na bieżni (6–7 km/h)' :
               'skipping lub marsz w miejscu (o niskiej intensywności)';

  // Dobierz alternatywę dla gum oporowych
  const bandAlternative = hasBands ? 'guma oporowa' : 'lekka hantla lub masa ciała';

  const warmupProtocols: Partial<Record<MuscleGroup, string>> = {
    'Klatka piersiowa':
      `1) 5 min ${cardioWarmup} | 2) 15× rotacje ramion w obie strony (duże kółka) | 3) 10× Arm Cross — krzyżowanie wyprostowanych rąk przed klatką | 4) 20× pompki z masą ciała w spokojnym tempie | 5) Rozciąganie klatki przy ścianie lub w framudze drzwi 30 sek/stronę. Pierwsze serie każdego ćwiczenia: 50% ciężaru docelowego × 15 powt.`,
    'Plecy':
      `1) 5 min ${cardioWarmup} | 2) 10× krążenia ramion w przód i w tył (pełen zakres) | 3) 15× band pull-apart z ${bandAlternative} | 4) Cat-Cow 10 cykli — mobilizacja kręgosłupa piersiowego | 5) Rotacje piersiowe w leżeniu na boku 10/stronę. Pierwsze serie: 50% ciężaru × 12 powt.`,
    'Nogi':
      `1) 5 min ${cardioWarmup} | 2) 20× przysiad z masą ciała (pełny zakres, 3 sek zejście) | 3) 10× wykroków naprzemiennych w miejscu | 4) 10× hip hinge z masą ciała — trenuj wzorzec zawiasowy | 5) Mobilizacja kostki — krążenia 10×/stronę | 6) 90/90 hip stretch 30 sek/stronę. Pierwsze serie: 50% ciężaru × 10 powt.`,
    'Barki':
      `1) 5 min ${cardioWarmup} | 2) 15× rotacje zewnętrzne ramienia z ${bandAlternative} — aktywacja rotatorów | 3) 10× band pull-apart lub odwrotne rozpiętki z hantlami | 4) Krążenia ramion: 10× małe kółka → 10× duże kółka | 5) Poprzeczne rozciąganie barku 30 sek/stronę. Pierwsze serie: 50% ciężaru × 15 powt.`,
    'Biceps':
      `1) 5 min ${cardioWarmup} | 2) Rozciąganie przedramion do przodu (prostowanie nadgarstka) 30 sek | 3) Rozciąganie przedramion do tyłu (zginanie grzbietowe) 30 sek | 4) 15× uginania z ${bandAlternative} | 5) Rozgrzewkowe serie z 40% ciężaru docelowego × 15 powt.`,
    'Triceps':
      `1) 5 min ${cardioWarmup} | 2) 15× pompki z masą ciała | 3) Rozciąganie tricepsa przez głowę — chwyć łokieć i pociągnij 30 sek/stronę | 4) Krążenia nadgarstków 10×/stronę | 5) Rozgrzewkowe serie pompek diamentowych lub pushdown z minimalnym obciążeniem.`,
    'Brzuch':
      `1) 5 min ${cardioWarmup} | 2) Plank 20 sek × 2 — aktywacja głębokiego core | 3) 15× skłony bez obciążenia (pełen zakres ruchu) | 4) Dead Bug 10/stronę — stabilizacja lędźwi | 5) Cat-Cow 10 cykli — mobilizacja kręgosłupa.`,
  };

  const defaultProtocol =
    `1) 5 min ${cardioWarmup} | 2) Mobilizacja wszystkich stawów zaangażowanych w trening: krążenia, skłony, rotacje | 3) 2–3 serie rozgrzewkowe z 50% ciężaru docelowego × 10–15 powt. Nie pomijaj rozgrzewki — zwiększa siłę o 5–10% i redukuje ryzyko kontuzji.`;

  return {
    id: `warmup-${dayIndex}-${Date.now()}`,
    name: '🔥 Rozgrzewka specyficzna',
    muscleGroup: 'Cardio',
    difficulty: 'Początkujący',
    description: 'Aktywacja układu nerwowo-mięśniowego, rozgrzanie stawów i przygotowanie ciała do wysiłku. Dobrze przeprowadzona rozgrzewka zwiększa siłę o 5–10% i redukuje ryzyko kontuzji.',
    sets: 1,
    reps: '10–12 min',
    restTime: 0,
    notes: warmupProtocols[primaryMuscle] ?? defaultProtocol,
    requiredEquipment: ['bodyweight'],
  };
}

// ─── Główna logika budowania sesji treningowej ────────────────────────────────
// Kolejność ćwiczeń wg zasad biomechanicznych:
// 1. Rozgrzewka
// 2. Compound primary (największy CNS demand — gdy jesteś najświeższy)
// 3. Compound secondary (mniejsze CNS demand)
// 4. Isolation primary (izolacje gdy mięśnie już rozgrzane)
// 5. Isolation secondary / finishery
// 6. Core (na końcu — nie zmęczony przed compound ruchami)
// 7. Cardio (po siłówce — glikogen wyczerpany → więcej tłuszczu)

function buildWorkoutDay(
  splitDay: SplitDay,
  dayIndex: number,
  prefs: GeneratorPreferences,
  availableExercises: Exercise[],
  usedExerciseIds: Set<string>,
  excludedIds: Set<string> = new Set(),
): WorkoutDay {
  const { goal, fitnessLevel, sessionDuration, includeCardio, includeWarmup, focusMuscles } = prefs;
  const vp = getVolumeParams(goal, fitnessLevel);
  const isBeginner = fitnessLevel === 'beginner';
  const isAdvanced = fitnessLevel === 'advanced';

  // Budżet czasowy sesji
  const warmupMin = includeWarmup ? 12 : 0;
  const cardioMin = includeCardio ? (goal === 'fat_loss' ? 20 : goal === 'endurance' ? 30 : 15) : 0;
  const cooldownMin = 5;
  const workMin = Math.max(20, sessionDuration - warmupMin - cardioMin - cooldownMin);

  // Szacowany czas na ćwiczenie
  const minPerCompoundPrimary =
    (vp.setsCompoundPrimary * 1.5) +
    (vp.restCompoundPrimary / 60 * (vp.setsCompoundPrimary - 1));
  const minPerCompoundSecondary =
    (vp.setsCompoundSecondary * 1.2) +
    (vp.restCompoundSecondary / 60 * (vp.setsCompoundSecondary - 1));
  const minPerIsolation =
    (vp.setsIsolation * 1.0) +
    (vp.restIsolation / 60 * (vp.setsIsolation - 1));

  // Enriched pool ćwiczeń
  const enrichedPool = availableExercises.map(classifyExercise);

  // Helper: pobierz pule dla mięśnia z wykluczeniami
  const getPool = (muscle: MuscleGroup, roles: ExerciseRole[]) => {
    const all = enrichedPool.filter(e =>
      e.muscleGroup === muscle &&
      roles.includes(e.role) &&
      !usedExerciseIds.has(e.id)
    );
    const fresh = all.filter(e => !excludedIds.has(e.id));
    return fresh.length >= 2 ? fresh : all; // preferuj świeże, fallback do wszystkich
  };

  const exercises: Exercise[] = [];

  // ── 1. ROZGRZEWKA ────────────────────────────────────────────────────────
  if (includeWarmup) {
    exercises.push(buildWarmup(splitDay, dayIndex, prefs.equipmentList));
  }

  let usedTime = 0;

  // ── 2. COMPOUND PRIMARY ──────────────────────────────────────────────────
  // Zasada profesjonalnego trenera: zacznij od najtrudniejszego ćwiczenia
  // gdy CNS jest wypoczęty. Nigdy nie zaczynaj od izolacji.

  for (const muscle of splitDay.primaryMuscles) {
    if (usedTime > workMin - 10) break; // zostaw margines

    const isFocus = focusMuscles.includes(muscle);
    const compoundPool = getPool(muscle, ['compound_primary', 'compound_secondary']);
    const shuffled = weightedShuffle(compoundPool);

    // Dla początkujących — prefer compound_secondary (bezpieczniejsze)
    // Dla zaawansowanych — prefer compound_primary (większy bodziec)
    const preferredRole: ExerciseRole = isBeginner ? 'compound_secondary' : 'compound_primary';

    const primary =
      shuffled.find(e => e.role === preferredRole) ||
      shuffled.find(e => e.role === 'compound_primary') ||
      shuffled.find(e => e.role === 'compound_secondary') ||
      shuffled[0];

    if (primary) {
      const sets = isFocus
        ? vp.setsCompoundPrimary + 2  // Focus: +2 serie zamiast +1
        : vp.setsCompoundPrimary;

      const notePrefix = primary.notes ? `${primary.notes}\n\n` : '';
      exercises.push({
        ...primary,
        id: `${primary.id}-d${dayIndex}-${Date.now()}-cp`,
        sets,
        reps: vp.repsCompoundPrimary,
        restTime: vp.restCompoundPrimary,
        notes: `${notePrefix}${vp.trainerNoteCompound}`,
      });
      usedExerciseIds.add(primary.id);
      usedTime += minPerCompoundPrimary;

      // Dla zaawansowanych / focus muscles: drugie ćwiczenie compound (inny wzorzec ruchu)
      // np. po bench → dips lub po squat → BSS
      if ((isFocus || (isAdvanced && splitDay.primaryMuscles.length === 1)) && usedTime + minPerCompoundSecondary < workMin) {
        const remaining = shuffled.filter(e => !usedExerciseIds.has(e.id));
        const secondary = remaining[0];
        if (secondary) {
          exercises.push({
            ...secondary,
            id: `${secondary.id}-d${dayIndex}-${Date.now()}-cs2`,
            sets: vp.setsCompoundSecondary,
            reps: vp.repsCompoundSecondary,
            restTime: vp.restCompoundSecondary,
            notes: secondary.notes || '',
          });
          usedExerciseIds.add(secondary.id);
          usedTime += minPerCompoundSecondary;
        }
      }
    }
  }

  // ── 3. COMPOUND SECONDARY dla mięśni secondary ───────────────────────────
  // np. przy Push: po bench i OHP → triceps compound (dips lub CG bench)

  for (const muscle of splitDay.secondaryMuscles) {
    if (muscle === 'Brzuch') continue;
    if (usedTime > workMin - 8) break;

    const isFocus = focusMuscles.includes(muscle);
    const compoundPool = getPool(muscle, ['compound_primary', 'compound_secondary']);
    const shuffledSecondary = weightedShuffle(compoundPool);
    const secondaryCompound = shuffledSecondary[0];

    if (secondaryCompound) {
      exercises.push({
        ...secondaryCompound,
        id: `${secondaryCompound.id}-d${dayIndex}-${Date.now()}-sec-c`,
        sets: vp.setsCompoundSecondary,
        reps: vp.repsCompoundSecondary,
        restTime: vp.restCompoundSecondary,
        notes: secondaryCompound.notes || '',
      });
      usedExerciseIds.add(secondaryCompound.id);
      usedTime += minPerCompoundSecondary;

      // Focus muscle dostaje extra izolację
      if (isFocus && usedTime + minPerIsolation < workMin) {
        const isolPool = getPool(muscle, ['isolation_primary', 'isolation_secondary']);
        const iso = shuffle(isolPool)[0];
        if (iso) {
          exercises.push({
            ...iso,
            id: `${iso.id}-d${dayIndex}-${Date.now()}-sec-iso`,
            sets: vp.setsIsolation,
            reps: vp.repsIsolation,
            restTime: vp.restIsolation,
            notes: `${iso.notes || ''}\n\n${vp.trainerNoteIsolation}`,
          });
          usedExerciseIds.add(iso.id);
          usedTime += minPerIsolation;
        }
      }
    }
  }

  // ── 4. IZOLACJE dla mięśni primary ───────────────────────────────────────
  // Izolacje PO compound — mięśnie są rozgrzane, można skupić się na czuciu

  for (const muscle of splitDay.primaryMuscles) {
    if (usedTime > workMin - 6) break;

    const isFocus = focusMuscles.includes(muscle);
    const isolPool = getPool(muscle, ['isolation_primary', 'isolation_secondary']);
    const shuffledIso = shuffle(isolPool);

    // Focus muscles: znacznie więcej izolacji (specjalizacja)
    // Zaawansowany + focus: 3–4 izolacje (dedykowana sesja specjalizacyjna)
    // Średniozaaw + focus: 2–3 izolacje
    // Bez focus: 1 izolacja (standardowo)
    const isoCount = isFocus
      ? (isAdvanced ? 4 : isBeginner ? 2 : 3)
      : 1;

    for (let i = 0; i < Math.min(isoCount, shuffledIso.length); i++) {
      if (usedTime + minPerIsolation > workMin) break;
      const iso = shuffledIso[i];
      if (!iso || usedExerciseIds.has(iso.id)) continue;

      exercises.push({
        ...iso,
        id: `${iso.id}-d${dayIndex}-${Date.now()}-iso-${i}`,
        sets: vp.setsIsolation,
        reps: vp.repsIsolation,
        restTime: vp.restIsolation,
        notes: `${iso.notes || ''}\n\n${vp.trainerNoteIsolation}`,
      });
      usedExerciseIds.add(iso.id);
      usedTime += minPerIsolation;
    }
  }

  // ── 5. CORE ───────────────────────────────────────────────────────────────
  // Core ZAWSZE na końcu siłowej części treningu.
  // Powód: zmęczony core = niestabilny kręgosłup przy compound ruchach → kontuzja

  const hasCoreDay = splitDay.muscles.includes('Brzuch');
  const shouldAddCore =
    hasCoreDay ||
    goal === 'fat_loss' ||
    (goal === 'general_fitness' && Math.random() > 0.3);

  if (shouldAddCore && usedTime + 8 < sessionDuration) {
    const corePool = enrichedPool.filter(e =>
      e.muscleGroup === 'Brzuch' &&
      !exercises.some(ex => ex.name === e.name)
    );
    const freshCore = corePool.filter(e => !excludedIds.has(e.id));
    const coreList = shuffle(freshCore.length > 0 ? freshCore : corePool);

    // Początkujący: 1 ćwiczenie (plank lub dead bug)
    // Średniozaawansowany: 2 ćwiczenia (statyczne + dynamiczne)
    // Zaawansowany: 2–3 ćwiczenia (różne płaszczyzny ruchu)
    const coreCount = isBeginner ? 1 : isAdvanced ? 2 : 2;

    // Priorytet dla początkujących: plank i dead bug (bezpieczne)
    let coreToAdd = coreList;
    if (isBeginner) {
      const safeCores = coreList.filter(e =>
        ['Plank (deska)', 'Dead Bug', 'Boczny plank (side plank)', 'Hollow Body Hold'].includes(e.name)
      );
      if (safeCores.length > 0) coreToAdd = safeCores;
    }

    for (let i = 0; i < Math.min(coreCount, coreToAdd.length); i++) {
      const coreEx = coreToAdd[i];
      exercises.push({
        ...coreEx,
        id: `${coreEx.id}-d${dayIndex}-${Date.now()}-core-${i}`,
        sets: vp.setsCore,
        reps: vp.repsCore,
        restTime: 45,
        notes: `${coreEx.notes || 'Napnij brzuch jak przed uderzeniem przez cały ruch.'}\n\n🎯 Core trenuj z pełną koncentracją — to fundament każdego ruchu siłowego.`,
      });
    }
  }

  // ── 6. CARDIO ─────────────────────────────────────────────────────────────
  // Cardio PO treningu siłowym: glikogen wyczerpany → więcej tłuszczu jako paliwo
  // Wyjątek: aktywna regeneracja (trucht) może być przed jeśli celem jest wydolność

  if (includeCardio) {
    const cardioPool = availableExercises.filter(e => e.muscleGroup === 'Cardio');
    let cardio: Exercise | undefined;

    if (goal === 'fat_loss') {
      // HIIT preferowany — efekt EPOC
      cardio = cardioPool.find(e => e.name.includes('HIIT') || e.name.includes('interwałowy') || e.name.includes('Tabata'))
        || cardioPool.find(e => e.name.includes('Battle Ropes'))
        || shuffle(cardioPool)[0];
    } else if (goal === 'endurance') {
      // LISS — bazowy trening tlenowy
      cardio = cardioPool.find(e => e.name.includes('ciągły') || e.name.includes('Bieg ciągły') || e.name.includes('Ergometr'))
        || shuffle(cardioPool)[0];
    } else {
      // Losowe cardio dla różnorodności
      cardio = shuffle(cardioPool)[0];
    }

    if (cardio) {
      const duration = goal === 'fat_loss' ? 20 : goal === 'endurance' ? 30 : 15;
      const cardioNote =
        goal === 'fat_loss'
          ? '🔥 REDUKCJA: Intensywne tempo (75–85% max HR). HIIT: 30 sek praca / 90 sek odpoczynek × 8 rund. Efekt EPOC spala kalorie przez 24h po treningu.'
          : goal === 'endurance'
          ? '🏃 WYTRZYMAŁOŚĆ: Umiarkowane tempo (65–70% max HR) — możesz rozmawiać zdaniami. Rozwijasz pojemność tlenową i gęstość mitochondriów.'
          : '⚡ AKTYWNA REGENERACJA: Umiarkowane tempo, utrzymuje metabolizm i korzystnie wpływa na regenerację mięśni.';

      exercises.push({
        ...cardio,
        id: `cardio-${dayIndex}-${Date.now()}`,
        duration,
        notes: `${cardio.notes || ''}\n\n${cardioNote}`,
      });
    }
  }

  return {
    id: `gen-day-${dayIndex}`,
    dayIndex,
    name: DAY_NAMES[dayIndex],
    exercises,
    isRestDay: false,
    color: dayColors[dayIndex],
    notes: splitDay.label,
  } as WorkoutDay & { notes?: string };
}

// ─── Metadane i opis planu ─────────────────────────────────────────────────────

function getPlanMeta(prefs: GeneratorPreferences, totalSets: number) {
  const goalLabels: Record<string, string> = {
    muscle_gain:      'Budowa masy mięśniowej',
    fat_loss:         'Redukcja tkanki tłuszczowej',
    strength:         'Siła maksymalna',
    endurance:        'Wytrzymałość i kondycja',
    general_fitness:  'Ogólna sprawność fizyczna',
  };
  const styleLabels: Record<string, string> = {
    fbl:              'FBL Split',
    push_pull_legs:   'Push / Pull / Legs',
    upper_lower:      'Góra / Dół',
    full_body:        'Full Body',
    bro_split:        'Bro Split',
  };
  const levelLabels: Record<string, string> = {
    beginner:     'Początkujący',
    intermediate: 'Średniozaawansowany',
    advanced:     'Zaawansowany',
  };

  const actualDays = prefs.trainingDays.length > 0 ? prefs.trainingDays.length : prefs.daysPerWeek;
  const name = `${goalLabels[prefs.goal]} — ${styleLabels[prefs.trainingStyle]} (${actualDays}×/tydz.)`;

  const descriptions: Record<TrainingGoal, string> = {
    muscle_gain:
      `Plan hipertroficzny zaprojektowany wg zasad Evidence-Based Training. Objętość ${totalSets} serii/tydzień mieści się w optymalnym oknie hipertrofii (10–20 serii/partię/tydzień wg Krieger, 2010). Zakresy 6–12 powt. przy 70–80% 1RM z mechanic tension i metabolic stress jako głównymi czynnikami wzrostu (Schoenfeld, 2010). Przerwy 90–120 sek balansują między GH/IGF-1 a regeneracją fosfokreatyny.\n\n📋 Kluczowe zasady: progresywne przeciążenie co tydzień (+2.5kg lub +1 powt.), minimum 7h snu, białko 1.6–2.2g/kg BM, surplus kaloryczny 200–300 kcal.`,
    fat_loss:
      `Plan redukcyjny łączący maksymalne zachowanie mięśni z deficytem kalorycznym. Wysoka objętość (${totalSets} serii) i krótkie przerwy (45–75 sek) maksymalizują efekt EPOC — podwyższone spalanie przez 24–48h po treningu. Priorytet: zachowanie siły = zachowanie mięśni przy deficycie.\n\n📋 Kluczowe zasady: deficyt max 500 kcal/dzień, białko 2.2–2.4g/kg (wyższe przy redukcji), ${prefs.includeCardio ? 'cardio po siłówce gdy glikogen wyczerpany,' : ''} waga rano na czczo 1×/tydzień.`,
    strength:
      `Plan siłowy oparty na liniowej periodyzacji (Texas Method / 5×5 principles). Zakresy 3–6 powt. przy 85–95% 1RM trenują adaptacje neurologiczne: rekrutację jednostek motorycznych, synchronizację i koordinację między mięśniami. Przerwy 3–5 min OBOWIĄZKOWE — fosfokreatyna wymaga 3 min do pełnej resynttezy.\n\n📋 Kluczowe zasady: +2.5kg/sesję na dolne partie, +1.25kg na górne, deload co 4–6 tygodni (redukcja objętości o 40%), sen 8–9h, kreatyna 3–5g/dzień potwierdzona naukowo.`,
    endurance:
      `Plan wytrzymałościowy budujący pojemność aerobową (VO2max), gęstość mitochondriów i odporność mięśni na zmęczenie. Wysoka objętość powtórzeń (15–25) z krótkimi przerwami (30–60 sek) symuluje warunki długotrwałego wysiłku. Duże obciążenie całkowite tygodniowe dla adaptacji metabolicznych.\n\n📋 Kluczowe zasady: nawodnienie 2.5–3L/dzień, węglowodany przed treningiem (30–60g), suplement beta-alanina może opóźnić zmęczenie mięśni, periodicznie zwiększaj dystans/czas o max 10%/tydzień.`,
    general_fitness:
      `Zrównoważony plan dla ogólnej sprawności — łączy siłę, wytrzymałość i mobilność w optymalnych proporcjach. Idealne jako plan startowy lub utrzymaniowy. Technika i zakres ruchu zawsze priorytetowe nad ciężarem.\n\n📋 Kluczowe zasady: gdy ćwiczenie jest komfortowe przez 2 tygodnie → zwiększ ciężar lub objętość (nigdy jednocześnie), 150 min aktywności/tydzień = minimum WHO dla zdrowia, rozciąganie 10 min po każdym treningu.`,
  };

  // Dokładne obliczenie kalorii (MET × masa × czas)
  const metValues: Record<string, number> = {
    muscle_gain: 6.5,
    fat_loss: 8.5,
    strength: 5.5,
    endurance: 8.0,
    general_fitness: 6.0,
  };
  const actualDaysCount = prefs.trainingDays.length > 0 ? prefs.trainingDays.length : prefs.daysPerWeek;
  const kcalPerSession = Math.round(metValues[prefs.goal] * 75 * (prefs.sessionDuration / 60));
  const estimatedCalories = kcalPerSession * actualDaysCount;

  return {
    name,
    description: `${descriptions[prefs.goal]}\n\n📊 ${levelLabels[prefs.fitnessLevel]} | ${styleLabels[prefs.trainingStyle]} | ~${prefs.sessionDuration} min/sesję`,
    estimatedCalories,
  };
}

// ─── Modyfikacja splitu na podstawie priorytetów mięśniowych ─────────────────
// Jeśli użytkownik wybrał priorytet (np. Barki), silnik:
// 1. Przenosi priorytetową grupę do primaryMuscles w każdym dniu gdzie jest obecna
// 2. Przy bro splicie / FBL: wstawia dedykowaną sesję dla priorytetu jeśli jej nie ma
// 3. Zwraca zmodyfikowany split z realnie większą objętością dla priorytetu

function applyFocusMuscles(
  split: SplitDay[],
  focusMuscles: string[],
): SplitDay[] {
  if (focusMuscles.length === 0) return split;

  return split.map(day => {
    const modifiedDay = { ...day };
    const newPrimary = [...day.primaryMuscles];
    const newSecondary = [...day.secondaryMuscles];

    for (const focus of focusMuscles) {
      const muscle = focus as MuscleGroup;

      // Jeśli priorytetowa partia jest w secondary → przesuń do primary
      const secIdx = newSecondary.indexOf(muscle);
      if (secIdx !== -1) {
        newSecondary.splice(secIdx, 1);
        if (!newPrimary.includes(muscle)) {
          newPrimary.push(muscle);
        }
      }

      // Jeśli priorytetowa partia jest w primary → przesuń na początek listy
      // (pierwsze w primaryMuscles = więcej ćwiczeń i compound primary)
      const primIdx = newPrimary.indexOf(muscle);
      if (primIdx > 0) {
        newPrimary.splice(primIdx, 1);
        newPrimary.unshift(muscle);
      }
    }

    modifiedDay.primaryMuscles = newPrimary;
    modifiedDay.secondaryMuscles = newSecondary;
    modifiedDay.muscles = [...new Set([...newPrimary, ...newSecondary])];

    return modifiedDay;
  });
}

// ─── GŁÓWNA FUNKCJA GENERATORA ────────────────────────────────────────────────

export function generatePlan(prefs: GeneratorPreferences, excludedIds: Set<string> = new Set()): GeneratedPlan {
  const allDays: WorkoutDay[] = Array.from({ length: 7 }, (_, i) => ({
    id: `day-${i}`,
    dayIndex: i,
    name: DAY_NAMES[i],
    exercises: [],
    isRestDay: true,
    color: dayColors[i],
  }));

  // Użyj dni wybranych przez użytkownika — posortowane rosnąco (Pn → Nd)
  const trainingDayIndices = prefs.trainingDays.length > 0
    ? [...prefs.trainingDays].sort((a, b) => a - b)
    : assignDayIndices(prefs.daysPerWeek); // fallback dla starych preferencji bez trainingDays

  const rawSplit = getSplit(prefs.trainingStyle, trainingDayIndices.length, prefs.fitnessLevel);
  const split = applyFocusMuscles(rawSplit, prefs.focusMuscles);

  // Filtruj dostępne ćwiczenia
  let availableExercises = filterByEquipment(exerciseLibrary, prefs.equipmentList);
  availableExercises = filterByLevel(availableExercises, prefs.fitnessLevel);

  // Global tracking — każde ćwiczenie compound_primary używane max 1× w tygodniu
  // (dla splittów innych niż full body)
  // Wyjątek: przy full body każda sesja ma własną pulę (warianty A/B/C)
  const globalUsedIds = new Set<string>();

  trainingDayIndices.forEach((dayIdx, splitIdx) => {
    const usedForThisDay = prefs.trainingStyle === 'full_body'
      ? new Set<string>() // Full body: reset dla każdej sesji
      : globalUsedIds;    // Inne splity: globalne śledzenie

    const workoutDay = buildWorkoutDay(
      split[splitIdx],
      dayIdx,
      prefs,
      availableExercises,
      usedForThisDay,
      excludedIds,
    );

    // Aktualizuj globalny tracker (dla splitów z globalnym śledzeniem)
    if (prefs.trainingStyle !== 'full_body') {
      workoutDay.exercises.forEach(e => {
        const baseId = e.id.split('-d')[0];
        globalUsedIds.add(baseId);
      });
    }

    allDays[dayIdx] = workoutDay;
  });

  // Statystyki
  const totalExercises = allDays.reduce((s, d) =>
    s + d.exercises.filter(e =>
      e.name !== '🔥 Rozgrzewka specyficzna' &&
      e.muscleGroup !== 'Cardio'
    ).length, 0
  );
  const totalSets = allDays.reduce((s, d) =>
    s + d.exercises.reduce((ss, e) => ss + (e.sets || 0), 0), 0
  );

  const meta = getPlanMeta(prefs, totalSets);

  return {
    id: `plan-${Date.now()}`,
    name: meta.name,
    description: meta.description,
    goal: prefs.goal,
    fitnessLevel: prefs.fitnessLevel,
    daysPerWeek: prefs.trainingDays.length > 0 ? prefs.trainingDays.length : prefs.daysPerWeek,
    days: allDays,
    createdAt: new Date().toISOString(),
    estimatedCalories: meta.estimatedCalories,
    totalExercises,
    totalSets,
  };
}
