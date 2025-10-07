import React, { useEffect, useMemo } from 'react';
import { useBoard } from '../store/board';
import { BoardsAPI, ColumnsAPI, TasksAPI } from '../api/http';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { ColumnView } from './Column';
import type { Task } from '../store/board';

export const BoardPage: React.FC<{ boardId: string }> = ({ boardId }) => {
  const { columns, tasksByColumn, setColumns, setTasks } = useBoard();
  useRealtimeBoard(boardId);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const [cols, tasks] = await Promise.all([
        ColumnsAPI.byBoard(boardId),
        TasksAPI.byBoard(boardId),
      ]);
      setColumns(cols);
      setTasks(tasks);
    })();
  }, [boardId, setColumns, setTasks]);

  const createQuickTask = async () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;
    await TasksAPI.create({ boardId, columnId: firstColumn._id, title: 'Nueva tarea', position: (tasksByColumn[firstColumn._id]?.length || 0) });
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <h2 style={{ margin: 0 }}>Board #{boardId}</h2>
        <button onClick={createQuickTask} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
          + Tarea
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', overflowX: 'auto' }}>
        {columns.map(col => (
          <ColumnView
            key={col._id}
            column={col}
            tasks={tasksByColumn[col._id] || []}
          />
        ))}
      </div>
    </div>
  );
};
