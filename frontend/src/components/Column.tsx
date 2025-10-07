import React from 'react';
import type { Column, Task } from '../store/board';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { columnId, taskId } from '../dnd/utils';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTask } from './DraggableTask';

export const ColumnView: React.FC<{
  column: Column;
  tasks: Task[];
}> = ({ column, tasks }) => {
  // La columna también es droppable para permitir soltar al “vacío”
  const { setNodeRef } = useDroppable({ id: columnId(column._id) });

  return (
    <div
      ref={setNodeRef}
      className="w-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm backdrop-blur"
    >
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {column.title}
      </div>

      <SortableContext
        id={columnId(column._id)}
        items={tasks.map(t => taskId(t._id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map(t => (
            <DraggableTask key={t._id} task={t} />
          ))}
          {!tasks.length && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white/40 p-3 text-xs text-slate-400">
              Arrastra tareas aquí
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
};
