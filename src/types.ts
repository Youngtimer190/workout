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

export type View = 'dashboard' | 'planner' | 'library' | 'stats' | 'generator';

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
