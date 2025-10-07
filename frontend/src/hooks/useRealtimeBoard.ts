import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useBoard, Task } from '../store/board';

export function useRealtimeBoard(boardId: string) {
  const { upsertTask, removeTask, setBoardId } = useBoard();

  useEffect(() => {
    setBoardId(boardId);
    socket.emit('joinBoard', { boardId });

    const onTaskCreated = (t: Task) => upsertTask(t);
    const onTaskUpdated = (t: Task) => upsertTask(t);
    const onTaskMoved   = (t: Task) => upsertTask(t);
    const onTaskDeleted = (p: { id: string; columnId: string }) => removeTask(p.id, p.columnId);

    socket.on('task.created', onTaskCreated);
    socket.on('task.updated', onTaskUpdated);
    socket.on('task.moved', onTaskMoved);
    socket.on('task.deleted', onTaskDeleted);

    return () => {
      socket.off('task.created', onTaskCreated);
      socket.off('task.updated', onTaskUpdated);
      socket.off('task.moved', onTaskMoved);
      socket.off('task.deleted', onTaskDeleted);
    };
  }, [boardId, setBoardId, upsertTask, removeTask]);
}
