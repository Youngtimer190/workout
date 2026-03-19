import { WorkoutDay } from '../types';
import { dayColors } from '../data/exercises';

const DAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const WEEKS_STORAGE_KEY = 'workout-planner-weeks';

export interface WeekMeta {
  key: string;       // e.g. "2025-W03"
  label: string;     // e.g. "6 – 12 sty 2025"
  startDate: Date;
  endDate: Date;
  isCurrentWeek: boolean;
}

/** Returns Monday of the week containing `date` */
export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns ISO week key like "2025-W03" */
export function getWeekKey(monday: Date): string {
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNo = Math.ceil(
    ((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

const PL_MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

export function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const m1 = PL_MONTHS[monday.getMonth()];
  const m2 = PL_MONTHS[sunday.getMonth()];
  const y1 = monday.getFullYear();
  const y2 = sunday.getFullYear();
  if (y1 !== y2) return `${d1} ${m1} ${y1} – ${d2} ${m2} ${y2}`;
  if (m1 !== m2) return `${d1} ${m1} – ${d2} ${m2} ${y1}`;
  return `${d1} – ${d2} ${m1} ${y1}`;
}

export function buildWeekMeta(monday: Date): WeekMeta {
  const currentMonday = getMondayOf(new Date());
  const key = getWeekKey(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    key,
    label: formatWeekLabel(monday),
    startDate: new Date(monday),
    endDate: sunday,
    isCurrentWeek: monday.getTime() === currentMonday.getTime(),
  };
}

export function offsetWeek(monday: Date, delta: number): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + delta * 7);
  return d;
}

// ─── Storage helpers ──────────────────────────────────────────

type WeeksData = Record<string, WorkoutDay[]>;

function loadAllWeeks(): WeeksData {
  try {
    const raw = localStorage.getItem(WEEKS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveAllWeeks(data: WeeksData) {
  localStorage.setItem(WEEKS_STORAGE_KEY, JSON.stringify(data));
}

// Public aliases for external use (e.g. workoutStore sync)
export function loadAllWeeksLocal(): WeeksData {
  return loadAllWeeks();
}

export function saveAllWeeksLocal(data: WeeksData) {
  saveAllWeeks(data);
}

export function createDefaultDays(weekKey: string): WorkoutDay[] {
  return DAY_NAMES.map((name, i) => ({
    id: `${weekKey}-day-${i}`,
    dayIndex: i,
    name,
    exercises: [],
    isRestDay: i >= 5,
    color: dayColors[i],
  }));
}

export function loadWeekDays(weekKey: string): WorkoutDay[] {
  const all = loadAllWeeks();
  if (all[weekKey]) return all[weekKey];
  return createDefaultDays(weekKey);
}

export function saveWeekDays(weekKey: string, days: WorkoutDay[]) {
  const all = loadAllWeeks();
  all[weekKey] = days;
  saveAllWeeks(all);
}

export function deleteWeekDays(weekKey: string) {
  const all = loadAllWeeks();
  delete all[weekKey];
  saveAllWeeks(all);
}

export function getAllWeekKeys(): string[] {
  return Object.keys(loadAllWeeks());
}

/** Copy days from one week to another — resets all setLog completion status */
export function copyWeekDays(fromKey: string, toKey: string): WorkoutDay[] {
  const sourceDays = loadWeekDays(fromKey);

  const copied: WorkoutDay[] = sourceDays.map((day, i) => ({
    ...day,
    id: `${toKey}-day-${i}`,
    exercises: day.exercises.map(ex => {
      // Reset done=false for every set — keep weight/reps as reference for progression
      const freshSetLogs = Array.isArray(ex.setLogs)
        ? ex.setLogs.map(log => ({
            id: log.id,
            setNumber: log.setNumber,
            targetReps: log.targetReps,
            actualReps: log.actualReps,
            weight: log.weight,
            done: false,          // ← ALWAYS reset to false
            note: log.note,
          }))
        : [];

      return {
        ...ex,
        id: `${toKey}-${ex.id.split('-')[0]}-${i}-${Date.now()}-${Math.random()}`,
        setLogs: freshSetLogs,
      };
    }),
  }));

  saveWeekDays(toKey, copied);
  return copied;
}

/** Clear ALL local workout data (call on logout to prevent data leakage between users) */
export function clearLocalData() {
  localStorage.removeItem(WEEKS_STORAGE_KEY);
}

/** Migrate old single-week data to multi-week storage */
export function migrateOldData() {
  const OLD_KEY = 'workout-planner-days';
  const raw = localStorage.getItem(OLD_KEY);
  if (!raw) return;
  try {
    const oldDays: WorkoutDay[] = JSON.parse(raw);
    const currentMonday = getMondayOf(new Date());
    const weekKey = getWeekKey(currentMonday);
    const all = loadAllWeeks();
    if (!all[weekKey]) {
      all[weekKey] = oldDays;
      saveAllWeeks(all);
    }
    localStorage.removeItem(OLD_KEY);
  } catch {}
}
