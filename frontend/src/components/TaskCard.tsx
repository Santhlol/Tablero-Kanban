import React from 'react';
import type { Task } from '../store/board';

export const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="text-sm font-semibold text-slate-800">{task.title}</div>
      {task.description && (
        <p className="mt-2 text-xs text-slate-500">{task.description}</p>
      )}
    </div>
  );
};
