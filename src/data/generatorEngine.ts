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

type ExerciseRole = 'compound_primary' | 'compound_secondary' | 'isolation' | 'cardio' | 'warmup' | 'core';

interface EnrichedExercise extends Exercise {
  role: ExerciseRole;
  priority: number; // wyższy = ważniejszy w planie
}

type SplitDay = {
  label: string;
  muscles: MuscleGroup[];
  primaryMuscles: MuscleGroup[];   // główne partie (2-3 ćwiczenia)
  secondaryMuscles: MuscleGroup[]; // pomocnicze (1-2 ćwiczenia)
};

// ─── Klasyfikacja ćwiczeń (compound vs isolation, priorytet) ──────────────────

const COMPOUND_PRIMARY: string[] = [
  'Wyciskanie sztangi leżąc',
  'Wyciskanie skośne sztangą (górna klatka)',
  'Martwy ciąg konwencjonalny',
  'Martwy ciąg rumuński (RDL)',
  'Podciąganie na drążku (szerokim chwytem)',
  'Wiosłowanie sztangą w opadzie tułowia',
  'Przysiad ze sztangą (back squat)',
  'Przysiad przedni (front squat)',
  'Wyciskanie żołnierskie (OHP) ze sztangą',
  'Hip Thrust ze sztangą',
  'Przysiady bułgarskie (Bulgarian Split Squat)',
  'Clean & Press z hantlami',
  'Dipy na poręczach (wąskie, triceps)',
  'Pompki na poręczach (klatka)',
  'Wyciskanie wąskim chwytem',
  'French press (łamanie)ze sztangą leżąc',
  'Uginanie ramion ze sztangą stojąc',
];

const COMPOUND_SECONDARY: string[] = [
  'Wyciskanie hantli leżąc',
  'Wyciskanie skośne hantlami (górna klatka)',
  'Podciąganie neutralnym chwytem',
  'Wiosłowanie hantlem jednoręczne',
  'Wiosłowanie na wyciągu dolnym (siedzisko)',
  'Ściąganie drążka na wyciągu górnym (lat pulldown)',
  'Wyciskanie hantli nad głowę (siedząc)',
  'Arnoldpress z hantlami',
  'Wykroki chodzące z hantlami',
  'Prasa do nóg',
  'Martwy ciąg rumuński z hantlami (RDL)',
  'Pompki',
  'Kettelbell Swing',
  'Martwy ciąg z hantlami (sumo)',
  'Kettlebell Swing',
];

function classifyExercise(exercise: Exercise): EnrichedExercise {
  if (exercise.muscleGroup === 'Cardio') {
    return { ...exercise, role: 'cardio', priority: 1 };
  }
  if (exercise.muscleGroup === 'Brzuch') {
    return { ...exercise, role: 'core', priority: 2 };
  }
  if (COMPOUND_PRIMARY.includes(exercise.name)) {
    return { ...exercise, role: 'compound_primary', priority: 10 };
  }
  if (COMPOUND_SECONDARY.includes(exercise.name)) {
    return { ...exercise, role: 'compound_secondary', priority: 7 };
  }
  return { ...exercise, role: 'isolation', priority: 4 };
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
  if (level === 'intermediate') {
    // średniozaawansowany dostaje wszystko, ale preferuje łatwiejsze nad zaawansowanymi
    return exercises;
  }
  return exercises; // zaawansowany ma dostęp do wszystkiego
}

// ─── Parametry serii/powtórzeń/przerw dla danego celu ────────────────────────

interface VolumeParams {
  setsCompound: number;
  setsIsolation: number;
  repsCompound: string;
  repsIsolation: string;
  restCompound: number;  // sekundy
  restIsolation: number;
  repsCore: string;
  setsCore: number;
  tempoNote: string;
}

function getVolumeParams(goal: TrainingGoal, level: FitnessLevel): VolumeParams {
  const levelMod = level === 'beginner' ? -1 : level === 'advanced' ? 1 : 0;

  switch (goal) {
    case 'strength':
      return {
        setsCompound: Math.min(6, 4 + levelMod),
        setsIsolation: Math.max(2, 3 + levelMod),
        repsCompound: level === 'advanced' ? '3-5' : '4-6',
        repsIsolation: '6-8',
        restCompound: 240,
        restIsolation: 120,
        repsCore: '10-15',
        setsCore: 3,
        tempoNote: 'Ekscentryka 3 sek, koncentryka eksplozywna. Długie przerwy dla pełnej regeneracji CNS.',
      };
    case 'muscle_gain':
      return {
        setsCompound: Math.min(5, 3 + levelMod + 1),
        setsIsolation: Math.min(4, 3 + levelMod),
        repsCompound: level === 'advanced' ? '6-10' : '8-12',
        repsIsolation: '10-15',
        restCompound: 120,
        restIsolation: 75,
        repsCore: '15-20',
        setsCore: 3,
        tempoNote: 'Ekscentryka 2-3 sek. Ostatnia seria do technical failure. Progresywne przeciążenie co tydzień.',
      };
    case 'fat_loss':
      return {
        setsCompound: 3 + levelMod,
        setsIsolation: 3,
        repsCompound: '12-15',
        repsIsolation: '15-20',
        restCompound: 60,
        restIsolation: 45,
        repsCore: '20-25',
        setsCore: 3,
        tempoNote: 'Krótkie przerwy utrzymują tętno wysokie. Supersety tam gdzie możliwe. Ciągłe napięcie mięśnia.',
      };
    case 'endurance':
      return {
        setsCompound: Math.max(2, 2 + levelMod),
        setsIsolation: 2,
        repsCompound: '15-20',
        repsIsolation: '20-25',
        restCompound: 45,
        restIsolation: 30,
        repsCore: '25-30',
        setsCore: 3,
        tempoNote: 'Bardzo krótkie przerwy (30-45 sek). Utrzymuj stałe tempo przez całą sesję. Wysoka objętość.',
      };
    case 'general_fitness':
    default:
      return {
        setsCompound: 3 + levelMod,
        setsIsolation: 3,
        repsCompound: level === 'beginner' ? '10-12' : '8-12',
        repsIsolation: '12-15',
        restCompound: 90,
        restIsolation: 60,
        repsCore: '15-20',
        setsCore: 3,
        tempoNote: 'Kontrolowane tempo, pełen zakres ruchu. Skup się na technice — ciężar jest wtórny.',
      };
  }
}

// ─── Definicje podziałów treningowych ─────────────────────────────────────────

function getSplit(style: string, daysPerWeek: number, _level: FitnessLevel): SplitDay[] {

  // FULL BODY — dla każdego poziomu, szczególnie skuteczny dla początkujących
  if (style === 'full_body') {
    const variations: SplitDay[] = [
      {
        label: 'Full Body A (Nacisk: Pchanie)',
        muscles: ['Klatka piersiowa', 'Plecy', 'Nogi', 'Barki', 'Triceps', 'Brzuch'],
        primaryMuscles: ['Klatka piersiowa', 'Nogi', 'Plecy'],
        secondaryMuscles: ['Barki', 'Triceps', 'Brzuch'],
      },
      {
        label: 'Full Body B (Nacisk: Ciągnięcie)',
        muscles: ['Plecy', 'Nogi', 'Klatka piersiowa', 'Biceps', 'Barki', 'Brzuch'],
        primaryMuscles: ['Plecy', 'Nogi', 'Klatka piersiowa'],
        secondaryMuscles: ['Biceps', 'Barki', 'Brzuch'],
      },
      {
        label: 'Full Body C (Nacisk: Nogi)',
        muscles: ['Nogi', 'Plecy', 'Klatka piersiowa', 'Barki', 'Brzuch'],
        primaryMuscles: ['Nogi', 'Plecy', 'Klatka piersiowa'],
        secondaryMuscles: ['Barki', 'Brzuch'],
      },
    ];
    return Array.from({ length: daysPerWeek }, (_, i) => variations[i % variations.length]);
  }

  // UPPER / LOWER — dobry dla 4 dni, świetna częstotliwość każdej partii
  if (style === 'upper_lower') {
    const upper_A: SplitDay = {
      label: 'Góra ciała A (Pchanie)',
      muscles: ['Klatka piersiowa', 'Barki', 'Triceps', 'Plecy'],
      primaryMuscles: ['Klatka piersiowa', 'Barki'],
      secondaryMuscles: ['Triceps', 'Plecy'],
    };
    const upper_B: SplitDay = {
      label: 'Góra ciała B (Ciągnięcie)',
      muscles: ['Plecy', 'Biceps', 'Barki', 'Klatka piersiowa'],
      primaryMuscles: ['Plecy', 'Biceps'],
      secondaryMuscles: ['Barki', 'Klatka piersiowa'],
    };
    const lower_A: SplitDay = {
      label: 'Dół ciała A (Quad Dominant)',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
    };
    const lower_B: SplitDay = {
      label: 'Dół ciała B (Hip Dominant)',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
    };
    const pattern = [upper_A, lower_A, upper_B, lower_B];
    return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % pattern.length]);
  }

  // PUSH / PULL / LEGS — klasyk dla 3-6 dni, świetna specjalizacja
  if (style === 'push_pull_legs') {
    const push: SplitDay = {
      label: 'Push — Pchanie (Klatka, Barki, Triceps)',
      muscles: ['Klatka piersiowa', 'Barki', 'Triceps'],
      primaryMuscles: ['Klatka piersiowa', 'Barki'],
      secondaryMuscles: ['Triceps'],
    };
    const pull: SplitDay = {
      label: 'Pull — Ciągnięcie (Plecy, Biceps)',
      muscles: ['Plecy', 'Biceps', 'Barki'],
      primaryMuscles: ['Plecy', 'Biceps'],
      secondaryMuscles: ['Barki'],
    };
    const legs: SplitDay = {
      label: 'Legs — Nogi (+ Brzuch)',
      muscles: ['Nogi', 'Brzuch'],
      primaryMuscles: ['Nogi'],
      secondaryMuscles: ['Brzuch'],
    };
    const pattern = [push, pull, legs];
    // Dla 6 dni: PPL PPL, dla 5: PPL PP, dla 4: PPL P
    return Array.from({ length: daysPerWeek }, (_, i) => pattern[i % pattern.length]);
  }

  // BRO SPLIT — jedno partie na sesję, wysoka izolacja, popularna
  if (style === 'bro_split') {
    const days: SplitDay[] = [
      {
        label: 'Klatka piersiowa',
        muscles: ['Klatka piersiowa', 'Triceps'],
        primaryMuscles: ['Klatka piersiowa'],
        secondaryMuscles: ['Triceps'],
      },
      {
        label: 'Plecy',
        muscles: ['Plecy', 'Biceps'],
        primaryMuscles: ['Plecy'],
        secondaryMuscles: ['Biceps'],
      },
      {
        label: 'Nogi',
        muscles: ['Nogi', 'Brzuch'],
        primaryMuscles: ['Nogi'],
        secondaryMuscles: ['Brzuch'],
      },
      {
        label: 'Barki',
        muscles: ['Barki', 'Triceps'],
        primaryMuscles: ['Barki'],
        secondaryMuscles: ['Triceps'],
      },
      {
        label: 'Ramiona',
        muscles: ['Biceps', 'Triceps', 'Brzuch'],
        primaryMuscles: ['Biceps', 'Triceps'],
        secondaryMuscles: ['Brzuch'],
      },
    ];
    return Array.from({ length: daysPerWeek }, (_, i) => days[i % days.length]);
  }

  // FBL (Frequency Based) — częste treningi każdej partii
  const fbl: SplitDay[] = [
    {
      label: 'Klatka & Triceps (Siłowy)',
      muscles: ['Klatka piersiowa', 'Triceps', 'Brzuch'],
      primaryMuscles: ['Klatka piersiowa'],
      secondaryMuscles: ['Triceps', 'Brzuch'],
    },
    {
      label: 'Plecy & Biceps (Siłowy)',
      muscles: ['Plecy', 'Biceps'],
      primaryMuscles: ['Plecy'],
      secondaryMuscles: ['Biceps'],
    },
    {
      label: 'Nogi & Barki',
      muscles: ['Nogi', 'Barki', 'Brzuch'],
      primaryMuscles: ['Nogi', 'Barki'],
      secondaryMuscles: ['Brzuch'],
    },
    {
      label: 'Klatka & Plecy (Hipertrofia)',
      muscles: ['Klatka piersiowa', 'Plecy', 'Brzuch'],
      primaryMuscles: ['Klatka piersiowa', 'Plecy'],
      secondaryMuscles: ['Brzuch'],
    },
    {
      label: 'Ramiona & Core',
      muscles: ['Biceps', 'Triceps', 'Barki', 'Brzuch'],
      primaryMuscles: ['Biceps', 'Triceps', 'Barki'],
      secondaryMuscles: ['Brzuch'],
    },
  ];
  return Array.from({ length: daysPerWeek }, (_, i) => fbl[i % fbl.length]);
}

// ─── Optymalny rozkład dni w tygodniu ────────────────────────────────────────

function assignDayIndices(daysPerWeek: number): number[] {
  // Zgodnie z zasadą: min. 1 dzień odpoczynku między ciężkimi sesjami
  const schedules: Record<number, number[]> = {
    2: [1, 4],           // Wt, Pt — maks. odpoczynek
    3: [0, 2, 4],        // Pn, Śr, Pt — klasyka
    4: [0, 1, 3, 4],     // Pn, Wt, Cz, Pt — 2+2
    5: [0, 1, 2, 3, 4],  // Pn-Pt
    6: [0, 1, 2, 3, 4, 5], // Pn-Sb
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return schedules[daysPerWeek] || schedules[3];
}

// ─── Generowanie rozgrzewki dopasowanej do dnia ──────────────────────────────

function buildWarmup(splitDay: SplitDay, dayIndex: number): Exercise {
  const primaryMuscle = splitDay.primaryMuscles[0];

  const warmupNotes: Partial<Record<MuscleGroup, string>> = {
    'Klatka piersiowa': '5 min bieżnia lub rower + 10 krążeń ramion + 15 pompek z masą ciała (50% intensywności)',
    'Plecy': '5 min rower + 10 krążeń ramion + 15 powtórzeń ściągania gumy oporowej + mobilizacja klatki piersiowej',
    'Nogi': '5 min rower lub marsz + 15 przysiadów BW + 10 wykroków BW + mobilizacja bioder i kostek',
    'Barki': '5 min lekkie cardio + rotacje ramion + 15 powtórzeń face pulls z gumą + krążenia szyi',
    'Biceps': '5 min cardio + rozgrzewkowe serie z 30% ciężaru docelowego + rozciąganie przedramion',
    'Triceps': '5 min cardio + pompki z masą ciała + rozciąganie tricepsa przez głowę',
    'Brzuch': '5 min cardio + 20 sek plank x2 + 15 skrętosklonów bez obciążenia',
  };

  return {
    id: `warmup-${dayIndex}-${Date.now()}`,
    name: '🔥 Rozgrzewka ogólna i specyficzna',
    muscleGroup: 'Cardio',
    difficulty: 'Początkujący',
    description: 'Przygotowanie układu krążenia, stawów i mięśni do głównej pracy. Zmniejsza ryzyko kontuzji o ~50%.',
    sets: 1,
    reps: '10-15 min',
    restTime: 0,
    notes: warmupNotes[primaryMuscle] || '5 min cardio o niskiej intensywności + mobilizacja stawów pracujących podczas treningu',
    requiredEquipment: ['bodyweight'],
  };
}

// ─── Budowanie jednego dnia treningowego ─────────────────────────────────────

function buildWorkoutDay(
  splitDay: SplitDay,
  dayIndex: number,
  prefs: GeneratorPreferences,
  availableExercises: Exercise[],
  usedCompoundIds: Set<string>,
): WorkoutDay {
  const { goal, fitnessLevel, sessionDuration, includeCardio, includeWarmup, focusMuscles } = prefs;
  const volumeParams = getVolumeParams(goal, fitnessLevel);

  // Szacowanie liczby ćwiczeń na sesję na podstawie czasu
  const warmupMinutes = includeWarmup ? 12 : 0;
  const cardioMinutes = includeCardio ? (goal === 'fat_loss' ? 20 : 15) : 0;
  const cooldownMinutes = 5;
  const workMinutes = sessionDuration - warmupMinutes - cardioMinutes - cooldownMinutes;

  // Czas na jedno ćwiczenie (serie × czas serii + przerwy)
  const minutesPerCompound = goal === 'strength'
    ? (volumeParams.setsCompound * 1.5) + (volumeParams.restCompound / 60 * (volumeParams.setsCompound - 1))
    : (volumeParams.setsCompound * 1.2) + (volumeParams.restCompound / 60 * (volumeParams.setsCompound - 1));
  const minutesPerIsolation = (volumeParams.setsIsolation * 1.0) + (volumeParams.restIsolation / 60 * (volumeParams.setsIsolation - 1));

  // Ustal liczbę ćwiczeń każdego rodzaju
  let primaryCount = splitDay.primaryMuscles.length <= 2 ? 2 : 1; // compound na każdą główną partię
  let secondaryCount = splitDay.secondaryMuscles.length;

  // Dostosuj do czasu
  const estimatedTime = primaryCount * minutesPerCompound + secondaryCount * minutesPerIsolation;
  if (estimatedTime > workMinutes + 10) {
    secondaryCount = Math.max(1, secondaryCount - 1);
  }

  const exercises: Exercise[] = [];

  // 1. ROZGRZEWKA
  if (includeWarmup) {
    exercises.push(buildWarmup(splitDay, dayIndex));
  }

  // 2. GŁÓWNE ĆWICZENIA COMPOUND (primaries)
  const enrichedAvailable = availableExercises.map(classifyExercise);

  for (const muscle of splitDay.primaryMuscles) {
    const isFocus = focusMuscles.includes(muscle);
    const compoundsForMuscle = enrichedAvailable
      .filter(e =>
        e.muscleGroup === muscle &&
        (e.role === 'compound_primary' || e.role === 'compound_secondary') &&
        !usedCompoundIds.has(e.id)
      )
      .sort((a, b) => b.priority - a.priority); // wyższy priorytet pierwszy

    // Zaawansowani dostają compound primary, beginners mogą dostać secondary
    const preferredTier = fitnessLevel === 'beginner' ? 'compound_secondary' : 'compound_primary';
    const primary = compoundsForMuscle.find(e => e.role === preferredTier)
      || compoundsForMuscle.find(e => e.role === 'compound_primary')
      || compoundsForMuscle.find(e => e.role === 'compound_secondary')
      || enrichedAvailable.filter(e => e.muscleGroup === muscle && !usedCompoundIds.has(e.id))[0];

    if (primary) {
      const params = isFocus
        ? { sets: volumeParams.setsCompound + 1, reps: volumeParams.repsCompound, restTime: volumeParams.restCompound }
        : { sets: volumeParams.setsCompound, reps: volumeParams.repsCompound, restTime: volumeParams.restCompound };

      exercises.push({
        ...primary,
        id: `${primary.id}-d${dayIndex}-${Date.now()}-p`,
        ...params,
        notes: primary.notes
          ? `${primary.notes}\n\n💡 TRENER: ${volumeParams.tempoNote}`
          : `💡 TRENER: ${volumeParams.tempoNote}`,
      });
      usedCompoundIds.add(primary.id);
    }

    // Drugie ćwiczenie compound dla FOCUS muscles lub zaawansowanych przy bro splicie
    if (isFocus || (fitnessLevel === 'advanced' && splitDay.primaryMuscles.length === 1)) {
      const secondary = compoundsForMuscle.find(
        e => e.id !== (primary?.id || '') && !usedCompoundIds.has(e.id)
      );
      if (secondary) {
        exercises.push({
          ...secondary,
          id: `${secondary.id}-d${dayIndex}-${Date.now()}-p2`,
          sets: volumeParams.setsCompound,
          reps: volumeParams.repsCompound,
          restTime: volumeParams.restCompound,
        });
        usedCompoundIds.add(secondary.id);
      }
    }
  }

  // 3. ĆWICZENIA IZOLOWANE (secondaries)
  // usedInDay intentionally not used — tracking via name matching below

  for (const muscle of splitDay.secondaryMuscles) {
    if (muscle === 'Brzuch') continue; // core dodamy osobno na końcu

    const isolations = enrichedAvailable
      .filter(e =>
        e.muscleGroup === muscle &&
        e.role === 'isolation' &&
        !exercises.some(ex => ex.name === e.name)
      )
      .sort(() => Math.random() - 0.5);

    // Wybierz 1-2 ćwiczenia izolowane dla partii pomocniczej
    const count = focusMuscles.includes(muscle) ? 2 : 1;
    for (let i = 0; i < Math.min(count, isolations.length); i++) {
      exercises.push({
        ...isolations[i],
        id: `${isolations[i].id}-d${dayIndex}-${Date.now()}-iso-${i}`,
        sets: volumeParams.setsIsolation,
        reps: volumeParams.repsIsolation,
        restTime: volumeParams.restIsolation,
      });
    }

    // Fallback: jeśli brak izolacji, użyj compound secondary
    if (isolations.length === 0) {
      const fallback = enrichedAvailable
        .filter(e => e.muscleGroup === muscle && !exercises.some(ex => ex.name === e.name))
        .sort((a, b) => b.priority - a.priority)[0];
      if (fallback) {
        exercises.push({
          ...fallback,
          id: `${fallback.id}-d${dayIndex}-${Date.now()}-fb`,
          sets: volumeParams.setsIsolation,
          reps: volumeParams.repsIsolation,
          restTime: volumeParams.restIsolation,
        });
      }
    }
  }

  // 4. ĆWICZENIA CORE (brzuch) — na końcu głównej sesji przed cardio
  const hasCoreInPlan = splitDay.muscles.includes('Brzuch');
  const shouldAddCore = hasCoreInPlan ||
    (goal === 'general_fitness' && Math.random() > 0.5) ||
    goal === 'fat_loss';

  if (shouldAddCore && fitnessLevel !== 'beginner') {
    const coreExercises = enrichedAvailable
      .filter(e => e.muscleGroup === 'Brzuch' && !exercises.some(ex => ex.name === e.name))
      .sort(() => Math.random() - 0.5);

    const coreCount = fitnessLevel === 'advanced' ? 2 : 1;
    for (let i = 0; i < Math.min(coreCount, coreExercises.length); i++) {
      exercises.push({
        ...coreExercises[i],
        id: `${coreExercises[i].id}-d${dayIndex}-${Date.now()}-core-${i}`,
        sets: volumeParams.setsCore,
        reps: volumeParams.repsCore,
        restTime: 45,
        notes: coreExercises[i].notes || 'Napnij brzuch jak przed uderzeniem przez cały ruch.',
      });
    }
  } else if (shouldAddCore && fitnessLevel === 'beginner') {
    // Dla początkujących: prosty plank
    const plank = enrichedAvailable.find(e => e.name === 'Plank (deska)');
    if (plank && !exercises.some(ex => ex.name === plank.name)) {
      exercises.push({
        ...plank,
        id: `plank-${dayIndex}-${Date.now()}`,
        sets: 3,
        reps: '30-45 sek',
        restTime: 45,
      });
    }
  }

  // 5. CARDIO NA KOŃCU (opcjonalne)
  if (includeCardio) {
    const cardioPool = availableExercises.filter(e => e.muscleGroup === 'Cardio');
    // Dobierz cardio do celu
    let cardio: Exercise | undefined;
    if (goal === 'fat_loss') {
      cardio = cardioPool.find(e => e.name.includes('HIIT')) || cardioPool[0];
    } else if (goal === 'endurance') {
      cardio = cardioPool.find(e => e.name.includes('Bieg ciągły')) || cardioPool[0];
    } else {
      cardio = cardioPool[Math.floor(Math.random() * cardioPool.length)];
    }

    if (cardio) {
      const cardioDuration = goal === 'fat_loss' ? 20 : goal === 'endurance' ? 35 : 15;
      exercises.push({
        ...cardio,
        id: `cardio-${dayIndex}-${Date.now()}`,
        duration: cardioDuration,
        notes: goal === 'fat_loss'
          ? 'Intensywne tempo (75-85% max HR). HIIT: 30 sek sprint / 90 sek marsz × 8.'
          : goal === 'endurance'
          ? 'Umiarkowane tempo (65-70% max HR) — możesz rozmawiać. Nie forsuj.'
          : 'Umiarkowane tempo dla aktywnej regeneracji i poprawy wydolności.',
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

function getPlanMeta(prefs: GeneratorPreferences, _totalExercises: number, totalSets: number) {
  const goalLabels: Record<string, string> = {
    muscle_gain: 'Budowa masy mięśniowej',
    fat_loss: 'Redukcja tkanki tłuszczowej',
    strength: 'Siła maksymalna',
    endurance: 'Wytrzymałość i kondycja',
    general_fitness: 'Ogólna sprawność fizyczna',
  };
  const styleLabels: Record<string, string> = {
    fbl: 'FBL Split',
    push_pull_legs: 'Push / Pull / Legs',
    upper_lower: 'Góra / Dół',
    full_body: 'Full Body',
    bro_split: 'Bro Split',
  };
  const levelLabels: Record<string, string> = {
    beginner: 'Początkujący',
    intermediate: 'Średniozaawansowany',
    advanced: 'Zaawansowany',
  };

  const name = `${goalLabels[prefs.goal]} — ${styleLabels[prefs.trainingStyle]} (${prefs.daysPerWeek}×/tydz.)`;

  // Profesjonalne opisy planów
  const descriptions: Record<TrainingGoal, string> = {
    muscle_gain: `Plan hipertroficzny zaprojektowany dla maksymalnego wzrostu masy mięśniowej. Objętość ${totalSets} serii/tydzień mieści się w optymalnym oknie hipertrofii (10-20 serii/partię). Zakresy powtórzeń 8-12 przy 70-80% 1RM z progresywnym przeciążeniem jako główny mechanizm wzrostu. Przerwy 75-120 sek. balansują syntezę hormonów anabolicznych z regeneracją. Kluczowe: zwiększaj ciężar o 2.5 kg gdy wykonasz górną granicę zakresu powtórzeń we wszystkich seriach.`,
    fat_loss: `Plan redukcyjny łączący trening siłowy (zachowanie masy mięśniowej) z deficytem kalorycznym. Wysoka objętość i krótkie przerwy (45-60 sek.) maksymalizują spalanie kalorii i efekt EPOC (podwyższone spalanie przez 24-48h po treningu). Zachowanie mięśni podczas redukcji wymaga minimum 1.6-2.2g białka/kg masy ciała. ${prefs.includeCardio ? 'Cardio po siłówce gdy glikogen jest wyczerpany — więcej tłuszczu jako paliwo.' : ''}`,
    strength: `Plan siłowy oparty na zasadach periodyzacji liniowej. Zakresy 3-6 powtórzeń przy 85-95% 1RM trenują adaptacje neurologiczne (rekrutacja jednostek motorycznych, synchronizacja). Długie przerwy (3-4 min) są OBOWIĄZKOWE dla pełnej regeneracji CNS — nie skracaj ich. Progresja: +2.5 kg co sesję na ćwiczenia dolne, +1.25 kg na górne gdy nie możesz zrobić min. serii z założonym ciężarem.`,
    endurance: `Plan wytrzymałościowy budujący pojemność aerobową (VO2max), gęstość mitochondriów i odporność mięśni na zmęczenie. Krótkie przerwy (30-45 sek.) z wysokimi powtórzeniami (15-25) symulują warunki wysiłku długotrwałego. Łączy trening siłowy wytrzymałościowy z sesjami cardio dla kompleksowego efektu. Kluczowe: nawodnienie i węglowodany przed treningiem.`,
    general_fitness: `Zrównoważony plan dla ogólnej sprawności fizycznej. Łączy ćwiczenia siłowe, cardio i mobilność w optymalnych proporcjach. Kontrolowane tempo i pełen zakres ruchu budują wzorce ruchowe zapobiegające kontuzjom. Idealny punkt startowy lub plan utrzymaniowy dla aktywnych osób. Postęp: gdy wszystkie ćwiczenia są komfortowe — zwiększ ciężar lub objętość (nie jednocześnie!).`,
  };

  // Kalorie: dokładniejsze obliczenie
  const metPerGoal: Record<string, number> = {
    muscle_gain: 6.5,
    fat_loss: 8.0,
    strength: 5.5,
    endurance: 7.5,
    general_fitness: 6.0,
  };
  const avgSessionMinutes = prefs.sessionDuration;
  const kcalPerSession = Math.round(metPerGoal[prefs.goal] * 75 * (avgSessionMinutes / 60)); // 75 kg avg
  const estimatedCalories = kcalPerSession * prefs.daysPerWeek;

  return {
    name,
    description: `${descriptions[prefs.goal]}\n\n📊 Poziom: ${levelLabels[prefs.fitnessLevel]} | Split: ${styleLabels[prefs.trainingStyle]} | Sesja: ~${prefs.sessionDuration} min`,
    estimatedCalories,
  };
}

// ─── GŁÓWNA FUNKCJA GENERATORA ────────────────────────────────────────────────

export function generatePlan(prefs: GeneratorPreferences): GeneratedPlan {
  // Inicjalizuj wszystkie dni jako dni odpoczynku
  const allDays: WorkoutDay[] = Array.from({ length: 7 }, (_, i) => ({
    id: `day-${i}`,
    dayIndex: i,
    name: DAY_NAMES[i],
    exercises: [],
    isRestDay: true,
    color: dayColors[i],
  }));

  // Wyznacz dni treningowe
  const trainingDayIndices = assignDayIndices(prefs.daysPerWeek);

  // Pobierz podział treningowy
  const split = getSplit(prefs.trainingStyle, prefs.daysPerWeek, prefs.fitnessLevel);

  // Filtruj ćwiczenia
  let availableExercises = filterByEquipment(exerciseLibrary, prefs.equipmentList);
  availableExercises = filterByLevel(availableExercises, prefs.fitnessLevel);

  // Dla Full Body resetujemy usedCompounds co sesję, dla innych splittów — globalnie
  // Ale compound primary nigdy nie powtarzamy w tygodniu (za dużo stresu)
  const globalUsedCompounds = new Set<string>();

  trainingDayIndices.forEach((dayIdx, splitIdx) => {
    // Full Body: każda sesja może mieć te same compounds (różne warianty A/B/C)
    const usedForThisDay = prefs.trainingStyle === 'full_body'
      ? new Set<string>()
      : globalUsedCompounds;

    const workoutDay = buildWorkoutDay(
      split[splitIdx],
      dayIdx,
      prefs,
      availableExercises,
      usedForThisDay,
    );

    if (prefs.trainingStyle !== 'full_body') {
      // Dodaj użyte ćwiczenia do globalnego setu
      workoutDay.exercises.forEach(e => {
        const baseId = e.id.split('-d')[0];
        globalUsedCompounds.add(baseId);
      });
    }

    allDays[dayIdx] = workoutDay;
  });

  // Oblicz statystyki planu
  const totalExercises = allDays.reduce((s, d) =>
    s + d.exercises.filter(e => e.muscleGroup !== 'Cardio' || e.name !== '🔥 Rozgrzewka ogólna i specyficzna').length, 0
  );
  const totalSets = allDays.reduce((s, d) =>
    s + d.exercises.reduce((ss, e) => ss + (e.sets || 0), 0), 0
  );

  const meta = getPlanMeta(prefs, totalExercises, totalSets);

  return {
    id: `plan-${Date.now()}`,
    name: meta.name,
    description: meta.description,
    goal: prefs.goal,
    fitnessLevel: prefs.fitnessLevel,
    daysPerWeek: prefs.daysPerWeek,
    days: allDays,
    createdAt: new Date().toISOString(),
    estimatedCalories: meta.estimatedCalories,
    totalExercises,
    totalSets,
  };
}
