import React from 'react';
import type { Task } from '../store/board';

export const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div style={{ padding: '8px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', marginBottom: 8 }}>
      <div style={{ fontWeight: 600 }}>{task.title}</div>
      {task.description && <div style={{ fontSize: 12, color: '#666' }}>{task.description}</div>}
    </div>
  );
};
