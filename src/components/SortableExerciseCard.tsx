import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Exercise } from '../types';
import ExerciseCard from './ExerciseCard';

interface Props {
  exercise: Exercise;
  onRemove: () => void;
  onUpdate: (updates: Partial<Exercise>) => void;
  onReplace: (newExercise: Exercise) => void;
  customExercises?: Exercise[];
}

export default function SortableExerciseCard({ exercise, onRemove, onUpdate, onReplace, customExercises = [] }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle — separate from card content */}
      <div className="relative">
        {/* Invisible drag handle strip on the left edge */}
        <div
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-6 z-10 cursor-grab active:cursor-grabbing flex items-center justify-center"
          title="Przeciągnij aby zmienić kolejność"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-slate-300">
            <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
            <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
          </svg>
        </div>
        {/* Actual card — offset to make room for handle */}
        <div className="pl-5">
          <ExerciseCard
            exercise={exercise}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onReplace={onReplace}
            customExercises={customExercises}
          />
        </div>
      </div>
    </div>
  );
}
