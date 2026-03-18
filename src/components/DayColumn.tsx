import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { WorkoutDay, Exercise } from '../types';
import SortableExerciseCard from './SortableExerciseCard';
import AddExerciseModal from './AddExerciseModal';
import { muscleGroupBgColors } from '../data/exercises';

interface DayColumnProps {
  day: WorkoutDay;
  index: number;
  onToggleRest: () => void;
  onAddExercise: (exercise: Exercise) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onReplaceExercise: (exerciseId: string, newExercise: Exercise) => void;
  onReorderExercises: (exercises: Exercise[]) => void;
  customExercises?: Exercise[];
  onSaveCustomExercise?: (exercise: Exercise) => void;
}

const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

export default function DayColumn({
  day,
  index,
  onToggleRest,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  onReplaceExercise,
  onReorderExercises,
  customExercises = [],
  onSaveCustomExercise,
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    })
  );

  const totalSets = day.exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const completedExercises = day.exercises.filter(e =>
    e.setLogs && e.setLogs.length > 0 && e.setLogs.every(s => s.done)
  ).length;
  const shortLabel = DAY_LABELS[index] ?? '';

  const handleDragStart = (event: DragStartEvent) => {
    const ex = day.exercises.find(e => e.id === event.active.id);
    setActiveExercise(ex ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveExercise(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = day.exercises.findIndex(e => e.id === active.id);
    const newIndex = day.exercises.findIndex(e => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(day.exercises, oldIndex, newIndex);
    onReorderExercises(reordered);
  };

  return (
    <>
      <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
        day.isRestDay ? 'border-slate-100 opacity-80' : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
      }`}>

        {/* Header — always visible, click to collapse */}
        <div
          className={`bg-gradient-to-r ${day.color} cursor-pointer select-none`}
          onClick={() => setCollapsed(prev => !prev)}
        >
          <div className="flex items-center gap-3 px-4 py-3.5">

            {/* Day badge */}
            <div className="w-10 h-10 rounded-xl bg-white/20 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm leading-tight">{shortLabel}</span>
            </div>

            {/* Day info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight truncate">{day.name}</p>
              {day.isRestDay ? (
                <p className="text-white/70 text-xs mt-0.5">🌙 Dzień odpoczynku</p>
              ) : day.exercises.length === 0 ? (
                <p className="text-white/70 text-xs mt-0.5">Brak ćwiczeń – kliknij aby dodać</p>
              ) : (
                <p className="text-white/70 text-xs mt-0.5">
                  {day.exercises.length} ćw.
                  {totalSets > 0 && ` · ${totalSets} serii`}
                  {completedExercises > 0 && ` · ✓ ${completedExercises}/${day.exercises.length}`}
                </p>
              )}
            </div>

            {/* Progress pill */}
            {!day.isRestDay && day.exercises.length > 0 && completedExercises > 0 && (
              <div className="hidden sm:flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1 flex-shrink-0">
                <span className="text-white text-xs font-bold">{completedExercises}/{day.exercises.length}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Rest toggle */}
              <button
                onClick={e => { e.stopPropagation(); onToggleRest(); }}
                title={day.isRestDay ? 'Ustaw jako dzień treningowy' : 'Ustaw jako dzień odpoczynku'}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer"
              >
                {day.isRestDay ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                  </svg>
                )}
              </button>

              {/* Add exercise — quick access on header */}
              {!day.isRestDay && (
                <button
                  onClick={e => { e.stopPropagation(); setShowModal(true); }}
                  title="Dodaj ćwiczenie"
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}

              {/* Collapse chevron */}
              <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible body */}
        {!collapsed && (
          <div className="p-3 sm:p-4">
            {day.isRestDay ? (
              /* Rest day */
              <div className="flex items-center justify-between py-2 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl flex-shrink-0">😴</span>
                  <div className="min-w-0">
                    <p className="text-slate-600 font-semibold text-sm">Dzień odpoczynku</p>
                    <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">Regeneracja mięśni jest kluczowa dla postępów</p>
                  </div>
                </div>
                <button
                  onClick={onToggleRest}
                  className="text-xs text-violet-500 hover:text-violet-700 font-semibold underline underline-offset-2 transition-colors cursor-pointer flex-shrink-0"
                >
                  Zamień na trening
                </button>
              </div>
            ) : (
              /* Training day */
              <div className="space-y-2.5">
                {day.exercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-4xl mb-2">🏋️</span>
                    <p className="text-slate-500 font-semibold text-sm">Brak ćwiczeń</p>
                    <p className="text-slate-400 text-xs mt-1">Dodaj pierwsze ćwiczenie do tego dnia</p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={day.exercises.map(e => e.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {day.exercises.map(exercise => (
                          <SortableExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            onRemove={() => onRemoveExercise(exercise.id)}
                            onUpdate={updates => onUpdateExercise(exercise.id, updates)}
                            onReplace={newEx => onReplaceExercise(exercise.id, newEx)}
                            customExercises={customExercises}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    {/* Drag overlay — ghost card while dragging */}
                    <DragOverlay dropAnimation={{
                      duration: 200,
                      easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                    }}>
                      {activeExercise && (
                        <div className="bg-white rounded-xl border-2 border-violet-400 shadow-2xl shadow-violet-200 p-3 opacity-95 rotate-1">
                          <div className="flex items-center gap-2.5">
                            <div className="text-violet-400">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{activeExercise.name}</p>
                              <span className={`inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${muscleGroupBgColors[activeExercise.muscleGroup] || 'bg-slate-100 text-slate-500'}`}>
                                {activeExercise.muscleGroup}
                              </span>
                            </div>
                            {activeExercise.sets && (
                              <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                                {activeExercise.sets}×{activeExercise.reps}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </DragOverlay>
                  </DndContext>
                )}

                {/* Drag hint — visible only when exercises exist */}
                {day.exercises.length > 1 && (
                  <p className="text-center text-[11px] text-slate-300 flex items-center justify-center gap-1 pt-0.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                    </svg>
                    Przeciągnij ćwiczenie aby zmienić kolejność
                  </p>
                )}

                {/* Add exercise button */}
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Dodaj ćwiczenie
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AddExerciseModal
          dayName={day.name}
          onAdd={ex => { onAddExercise(ex); setShowModal(false); }}
          onClose={() => setShowModal(false)}
          customExercises={customExercises}
          onSaveCustom={onSaveCustomExercise}
        />
      )}
    </>
  );
}
