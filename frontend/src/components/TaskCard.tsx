import React from 'react';
import type { Task } from '../store/board';

type TaskCardProps = {
  task: Task;
  onClick?: () => void;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
    >
      <div className="text-sm font-semibold text-slate-800">{task.title}</div>
      {task.description && (
        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">{task.description}</p>
      )}
      {task.assignee && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-indigo-600">
          <span className="text-indigo-400">◎</span>
          {task.assignee}
        </p>
      )}
    </button>
  );
};
