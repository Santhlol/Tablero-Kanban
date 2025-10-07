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
    <div ref={setNodeRef} style={{ width: 280, background: '#f6f6f7', borderRadius: 10, padding: 10, border: '1px solid #e5e5e8' }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{column.title}</div>

      <SortableContext
        id={columnId(column._id)}
        items={tasks.map(t => taskId(t._id))}
        strategy={verticalListSortingStrategy}
      >
        <div>
          {tasks.map(t => <DraggableTask key={t._id} task={t} />)}
        </div>
      </SortableContext>
    </div>
  );
};
