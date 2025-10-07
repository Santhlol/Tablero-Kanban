// src/components/DraggableTask.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../store/board';
import { TaskCard } from './TaskCard';
import { taskId } from '../dnd/utils';

type DraggableTaskProps = {
  task: Task;
  onOpen: (task: Task) => void;
};

export const DraggableTask: React.FC<DraggableTaskProps> = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: taskId(task._id) });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 50 : undefined,
    boxShadow: isDragging ? '0 12px 32px -12px rgba(15, 23, 42, 0.45)' : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className="active:cursor-grabbing" {...attributes} {...listeners}>
      <TaskCard task={task} onClick={() => onOpen(task)} />
    </div>
  );
};
