import React from 'react';
import type { Column, Task } from '../store/board';
import { TaskCard } from './TaskCard';

export const ColumnView: React.FC<{
  column: Column;
  tasks: Task[];
  onDropTask?: (taskId: string, toColumnId: string, toIndex: number) => void;
}> = ({ column, tasks }) => {
  return (
    <div style={{ width: 280, background: '#f6f6f7', borderRadius: 10, padding: 10, border: '1px solid #e5e5e8' }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{column.title}</div>
      <div>
        {tasks.map(t => <TaskCard key={t._id} task={t} />)}
      </div>
    </div>
  );
};
