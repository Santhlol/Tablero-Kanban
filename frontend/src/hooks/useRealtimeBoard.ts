import { useEffect } from 'react';
import { socket } from '../lib/socket';
import type { Column, Task } from '../store/board';
import { useBoard } from '../store/board';
import type { BoardSummary } from '../types/board';

type UseRealtimeBoardOptions = {
  boardId?: string;
  onBoardCreated?: (board: BoardSummary) => void;
};

export function useRealtimeBoard(options: UseRealtimeBoardOptions | string) {
  // Backward compatibility: if string is passed, treat it as boardId
  const boardId = typeof options === 'string' ? options : options.boardId;
  const onBoardCreated = typeof options === 'object' ? options.onBoardCreated : undefined;
  
  const { upsertTask, removeTask, setBoardId, upsertColumn, removeColumn } = useBoard();

  useEffect(() => {
    // Only set boardId and join board if we have a specific boardId
    if (boardId) {
      setBoardId(boardId);
      socket.emit('joinBoard', { boardId });
    }

    const onTaskCreated = (t: Task) => upsertTask(t);
    const onTaskUpdated = (t: Task) => upsertTask(t);
    const onTaskMoved   = (t: Task) => upsertTask(t);
    const onTaskDeleted = (p: { id: string; columnId: string }) => removeTask(p.id, p.columnId);
    const onColumnCreated = (c: Column) => upsertColumn(c);
    const onColumnUpdated = (c: Column) => upsertColumn(c);
    const onColumnDeleted = (p: { id: string }) => removeColumn(p.id);
    const onBoardCreatedEvent = (board: BoardSummary) => {
      if (onBoardCreated) {
        onBoardCreated(board);
      }
    };

    // Always listen to task and column events (they're board-specific)
    if (boardId) {
      socket.on('task.created', onTaskCreated);
      socket.on('task.updated', onTaskUpdated);
      socket.on('task.moved', onTaskMoved);
      socket.on('task.deleted', onTaskDeleted);
      socket.on('column.created', onColumnCreated);
      socket.on('column.updated', onColumnUpdated);
      socket.on('column.deleted', onColumnDeleted);
    }

    // Listen to global board events if callback is provided
    if (onBoardCreated) {
      socket.on('board.created', onBoardCreatedEvent);
    }

    return () => {
      if (boardId) {
        socket.off('task.created', onTaskCreated);
        socket.off('task.updated', onTaskUpdated);
        socket.off('task.moved', onTaskMoved);
        socket.off('task.deleted', onTaskDeleted);
        socket.off('column.created', onColumnCreated);
        socket.off('column.updated', onColumnUpdated);
        socket.off('column.deleted', onColumnDeleted);
      }
      
      if (onBoardCreated) {
        socket.off('board.created', onBoardCreatedEvent);
      }
    };
  }, [boardId, setBoardId, upsertTask, removeTask, upsertColumn, removeColumn, onBoardCreated]);
}
