import { useEffect } from 'react';
import { socket } from '../lib/socket';
import type { Column, Task } from '../store/board';
import { useBoard } from '../store/board';
import type { BoardSummary } from '../types/board';
import type { ExportRecord } from '../types/export';

type BoardDeletedPayload = { id: string };

type UseRealtimeBoardOptions = {
  boardId?: string;
  onBoardCreated?: (board: BoardSummary) => void;
  onBoardUpdated?: (board: BoardSummary) => void;
  onBoardDeleted?: (payload: BoardDeletedPayload) => void;
  onExportRequested?: (payload: ExportRecord) => void;
  onExportCompleted?: (payload: ExportRecord) => void;
  onExportFailed?: (payload: ExportRecord) => void;
};

export function useRealtimeBoard(options: UseRealtimeBoardOptions | string) {
  // Backward compatibility: if string is passed, treat it as boardId
  const boardId = typeof options === 'string' ? options : options.boardId;
  const onBoardCreated = typeof options === 'object' ? options.onBoardCreated : undefined;
  const onBoardUpdated = typeof options === 'object' ? options.onBoardUpdated : undefined;
  const onBoardDeleted = typeof options === 'object' ? options.onBoardDeleted : undefined;
  const onExportRequested = typeof options === 'object' ? options.onExportRequested : undefined;
  const onExportCompleted = typeof options === 'object' ? options.onExportCompleted : undefined;
  const onExportFailed = typeof options === 'object' ? options.onExportFailed : undefined;
  
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
    const onBoardUpdatedEvent = (board: BoardSummary) => {
      if (onBoardUpdated) {
        onBoardUpdated(board);
      }
    };
    const onBoardDeletedEvent = (payload: BoardDeletedPayload) => {
      if (onBoardDeleted) {
        onBoardDeleted(payload);
      }
    };

    const onExportRequestedEvent = (payload: ExportRecord) => {
      if (onExportRequested) {
        onExportRequested(payload);
      }
    };
    const onExportCompletedEvent = (payload: ExportRecord) => {
      if (onExportCompleted) {
        onExportCompleted(payload);
      }
    };
    const onExportFailedEvent = (payload: ExportRecord) => {
      if (onExportFailed) {
        onExportFailed(payload);
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
      socket.on('export.requested', onExportRequestedEvent);
      socket.on('export.completed', onExportCompletedEvent);
      socket.on('export.failed', onExportFailedEvent);
    }

    // Listen to global board events if callback is provided
    if (onBoardCreated) {
      socket.on('board.created', onBoardCreatedEvent);
    }
    if (onBoardUpdated) {
      socket.on('board.updated', onBoardUpdatedEvent);
    }
    if (onBoardDeleted) {
      socket.on('board.deleted', onBoardDeletedEvent);
    }

    return () => {
      if (boardId) {
        socket.emit('leaveBoard', { boardId });
        socket.off('task.created', onTaskCreated);
        socket.off('task.updated', onTaskUpdated);
        socket.off('task.moved', onTaskMoved);
        socket.off('task.deleted', onTaskDeleted);
        socket.off('column.created', onColumnCreated);
        socket.off('column.updated', onColumnUpdated);
        socket.off('column.deleted', onColumnDeleted);
        socket.off('export.requested', onExportRequestedEvent);
        socket.off('export.completed', onExportCompletedEvent);
        socket.off('export.failed', onExportFailedEvent);
      }
      
      if (onBoardCreated) {
        socket.off('board.created', onBoardCreatedEvent);
      }
      if (onBoardUpdated) {
        socket.off('board.updated', onBoardUpdatedEvent);
      }
      if (onBoardDeleted) {
        socket.off('board.deleted', onBoardDeletedEvent);
      }
    };
  }, [
    boardId,
    setBoardId,
    upsertTask,
    removeTask,
    upsertColumn,
    removeColumn,
    onBoardCreated,
    onBoardUpdated,
    onBoardDeleted,
    onExportRequested,
    onExportCompleted,
    onExportFailed,
  ]);
}
