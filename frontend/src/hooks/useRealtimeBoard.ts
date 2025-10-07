import { useEffect } from 'react';
import { socket } from '../lib/socket';
import type { Column, Task } from '../store/board';
import { useBoard } from '../store/board';

export function useRealtimeBoard(boardId: string) {
  const { upsertTask, removeTask, setBoardId, upsertColumn, removeColumn } = useBoard();

  useEffect(() => {
    setBoardId(boardId);
    socket.emit('joinBoard', { boardId });

    const onTaskCreated = (t: Task) => upsertTask(t);
    const onTaskUpdated = (t: Task) => upsertTask(t);
    const onTaskMoved   = (t: Task) => upsertTask(t);
    const onTaskDeleted = (p: { id: string; columnId: string }) => removeTask(p.id, p.columnId);
    const onColumnCreated = (c: Column) => upsertColumn(c);
    const onColumnUpdated = (c: Column) => upsertColumn(c);
    const onColumnDeleted = (p: { id: string }) => removeColumn(p.id);

    socket.on('task.created', onTaskCreated);
    socket.on('task.updated', onTaskUpdated);
    socket.on('task.moved', onTaskMoved);
    socket.on('task.deleted', onTaskDeleted);
    socket.on('column.created', onColumnCreated);
    socket.on('column.updated', onColumnUpdated);
    socket.on('column.deleted', onColumnDeleted);

    return () => {
      socket.off('task.created', onTaskCreated);
      socket.off('task.updated', onTaskUpdated);
      socket.off('task.moved', onTaskMoved);
      socket.off('task.deleted', onTaskDeleted);
      socket.off('column.created', onColumnCreated);
      socket.off('column.updated', onColumnUpdated);
      socket.off('column.deleted', onColumnDeleted);
    };
  }, [boardId, setBoardId, upsertTask, removeTask, upsertColumn, removeColumn]);
}
