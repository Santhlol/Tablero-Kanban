import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardsAPI, ColumnsAPI, TasksAPI, ExportAPI } from '../api/http';
import { useBoard } from '../store/board';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { ColumnView } from './Column';
import { columnId, isTaskId, isColumnId, rawId } from '../dnd/utils';
import { computeNewPosition } from '../dnd/utils';
import type { BoardSummary } from '../types/board';
import type { Task } from '../store/board';
import { TaskModal, type TaskFormValues } from './TaskModal';
import { ColumnForm } from './ColumnForm';
import { TaskCard } from './TaskCard';
import type { ExportField, ExportRecord } from '../types/export';

const DEFAULT_EXPORT_FIELDS: ExportField[] = ['id', 'title', 'description', 'column', 'createdAt'];

const EXPORT_FIELD_LABELS: Record<ExportField, { label: string; description: string }> = {
  id: { label: 'ID de tarea', description: 'Identificador único de la tarjeta.' },
  title: { label: 'Título', description: 'Nombre visible de la tarea.' },
  description: { label: 'Descripción', description: 'Detalle o notas de la tarjeta.' },
  column: { label: 'Columna', description: 'Estado actual dentro del tablero.' },
  createdAt: { label: 'Fecha de creación', description: 'Cuándo se generó la tarea.' },
};

const EXPORT_NOTICE_STYLES = {
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-600',
} as const;

type BoardPageProps = {
  board: BoardSummary;
  onBack: () => void;
  onBoardUpdate: (board: BoardSummary) => void;
  onBoardDeleted: (boardId: string) => void;
};

export const BoardPage: React.FC<BoardPageProps> = ({ board, onBack, onBoardUpdate, onBoardDeleted }) => {
  const boardId = board._id;
  const {
    columns,
    tasksByColumn,
    setColumns,
    setTasks,
    moveTaskLocally,
    upsertColumn,
    updateColumn,
    removeColumn,
    upsertTask,
    removeTask,
  } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [quickTaskBusy, setQuickTaskBusy] = useState(false);
  const [quickTaskError, setQuickTaskError] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState<
    | { mode: 'create'; columnId: string }
    | { mode: 'edit'; task: Task }
    | null
  >(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(board.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [boardActionError, setBoardActionError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(DEFAULT_EXPORT_FIELDS);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportFormError, setExportFormError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<
    | { type: 'info' | 'success' | 'error'; message: string }
    | null
  >(null);
  const [lastExport, setLastExport] = useState<ExportRecord | null>(null);
  const exportPollTimeout = useRef<number | null>(null);
  const exportPollAttempts = useRef(0);

  useEffect(() => {
    if (!isRenaming) {
      setRenameValue(board.name);
    }
  }, [board.name, isRenaming]);

  const handleRealtimeBoardUpdated = useCallback(
    (updated: BoardSummary) => {
      if (updated._id !== boardId) return;
      onBoardUpdate(updated);
    },
    [boardId, onBoardUpdate],
  );

  const handleRealtimeBoardDeleted = useCallback(
    (payload: { id: string }) => {
      if (payload.id !== boardId) return;
      onBoardDeleted(boardId);
    },
    [boardId, onBoardDeleted],
  );

  const handleExportRequested = useCallback(
    (payload: ExportRecord) => {
      if (payload.boardId !== boardId) return;
      setLastExport(current => (current && current.requestId === payload.requestId ? { ...current, ...payload } : payload));
      setExportNotice({
        type: 'info',
        message: `Exportación solicitada. Enviaremos el CSV a ${payload.to}.`,
      });
    },
    [boardId],
  );

  const handleExportCompleted = useCallback(
    (payload: ExportRecord) => {
      if (payload.boardId !== boardId) return;
      setLastExport(payload);
      setExportNotice({
        type: 'success',
        message: `Exportación completada. Revisa tu correo (${payload.to}).`,
      });
    },
    [boardId],
  );

  const handleExportFailed = useCallback(
    (payload: ExportRecord) => {
      if (payload.boardId !== boardId) return;
      setLastExport(payload);
      setExportNotice({
        type: 'error',
        message: payload.error
          ? `La exportación falló: ${payload.error}`
          : 'La exportación del backlog no pudo completarse.',
      });
    },
    [boardId],
  );

  useRealtimeBoard({
    boardId,
    onBoardUpdated: handleRealtimeBoardUpdated,
    onBoardDeleted: handleRealtimeBoardDeleted,
    onExportRequested: handleExportRequested,
    onExportCompleted: handleExportCompleted,
    onExportFailed: handleExportFailed,
  });

  const clearExportPolling = useCallback(() => {
    if (exportPollTimeout.current !== null) {
      window.clearTimeout(exportPollTimeout.current);
      exportPollTimeout.current = null;
    }
    exportPollAttempts.current = 0;
  }, []);

  useEffect(() => () => clearExportPolling(), [clearExportPolling]);

  const pendingExportId = lastExport?.requestId ?? null;
  const pendingExportStatus = lastExport?.status ?? null;

  useEffect(() => {
    if (!pendingExportId || pendingExportStatus !== 'pending') {
      clearExportPolling();
      return;
    }

    let cancelled = false;
    exportPollAttempts.current = 0;

    const pollStatus = async () => {
      try {
        const status = await ExportAPI.status(pendingExportId);
        if (cancelled) return;
        setLastExport(status);
        if (status.status === 'pending') {
          exportPollAttempts.current += 1;
          if (exportPollAttempts.current >= 15) {
            clearExportPolling();
            setExportNotice({
              type: 'error',
              message:
                'La exportación sigue en curso. Revisa tu correo más tarde o vuelve a intentarlo en unos minutos.',
            });
            return;
          }
          const nextDelay = Math.min(4000 + exportPollAttempts.current * 1000, 10000);
          exportPollTimeout.current = window.setTimeout(pollStatus, nextDelay);
          return;
        }
        if (status.status === 'success') {
          setExportNotice({
            type: 'success',
            message: `Exportación completada. Revisa tu correo (${status.to}).`,
          });
        } else {
          setExportNotice({
            type: 'error',
            message: status.error
              ? `La exportación falló: ${status.error}`
              : 'La exportación del backlog no pudo completarse.',
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Polling export status failed', err);
        exportPollTimeout.current = window.setTimeout(pollStatus, 6000);
      }
    };

    exportPollTimeout.current = window.setTimeout(pollStatus, 4000);

    return () => {
      cancelled = true;
      clearExportPolling();
    };
  }, [pendingExportId, pendingExportStatus, clearExportPolling]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setColumns([]);
    setTasks([]);
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setCreateError(null);
    setQuickTaskError(null);
    setQuickTaskBusy(false);
    setShowExportPanel(false);
    setExportEmail('');
    setSelectedFields(DEFAULT_EXPORT_FIELDS);
    setExportFormError(null);
    setExportBusy(false);
    setExportNotice(null);
    setLastExport(null);

    (async () => {
      try {
        const [cols, tasks] = await Promise.all([
          ColumnsAPI.byBoard(boardId),
          TasksAPI.byBoard(boardId),
        ]);
        if (!alive) return;
        setColumns(cols);
        setTasks(tasks);
      } catch (err) {
        if (!alive) return;
        console.error('Error cargando tablero', err);
        setError('No se pudieron cargar las columnas del tablero. Intenta recargar.');
        setColumns([]);
        setTasks([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [boardId, setColumns, setTasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);
  const sortedTasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const [key, list] of Object.entries(tasksByColumn)) {
      map[key] = [...list].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasksByColumn]);

  const resetColumnForm = () => {
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setCreateError(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (isTaskId(activeId)) {
      setActiveTaskId(rawId(activeId));
      setActiveColumnId(null);
    } else if (isColumnId(activeId)) {
      setActiveColumnId(rawId(activeId));
      setActiveTaskId(null);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // active.id y over.id son DndId: "task:<id>" o "column:<id>"
    const activeId = String(active.id);
    const overId = String(over.id);

    if (isColumnId(activeId) && isColumnId(overId)) {
      const activeColumnId = rawId(activeId);
      const overColumnId = rawId(overId);
      if (activeColumnId === overColumnId) return;

      const ordered = [...columns].sort((a, b) => a.position - b.position);
      const activeIndex = ordered.findIndex(c => c._id === activeColumnId);
      const overIndex = ordered.findIndex(c => c._id === overColumnId);
      if (activeIndex === -1 || overIndex === -1) return;

      const nextOrder = ordered.slice();
      const [moved] = nextOrder.splice(activeIndex, 1);
      nextOrder.splice(overIndex, 0, moved);
      const destinationIndex = nextOrder.findIndex(c => c._id === activeColumnId);
      const before = nextOrder[destinationIndex - 1]?.position;
      const after = nextOrder[destinationIndex + 1]?.position;
      const newPosition = computeNewPosition(nextOrder.length, destinationIndex, before, after);

      updateColumn(activeColumnId, { position: newPosition });

      try {
        await ColumnsAPI.update(activeColumnId, { position: newPosition });
      } catch (err) {
        console.error('Move column failed', err);
        setColumns(ordered);
      }
      setActiveColumnId(null);
      setActiveTaskId(null);
      return;
    }

    if (!isTaskId(activeId)) return; // sólo arrastramos tareas

    const taskId = rawId(activeId);

    // Determinar columna destino y destino index
    let toColumnId: string;
    let destIndex: number;

    if (isTaskId(overId)) {
      const overTaskId = rawId(overId);
      // Encuentra la columna que contiene la tarea overTaskId
      const entry = Object.entries(tasksByColumn).find(([, list]) => list.some(t => t._id === overTaskId));
      if (!entry) return;
      toColumnId = entry[0];
      const list = tasksByColumn[toColumnId] || [];
      destIndex = list.findIndex(t => t._id === overTaskId);
    } else if (isColumnId(overId)) {
      toColumnId = rawId(overId);
      const list = tasksByColumn[toColumnId] || [];
      destIndex = list.length; // soltado al final de la columna
    } else {
      return;
    }

    // Columnas origen/destino y listas
    const fromColumnId = Object.keys(tasksByColumn).find(cid => (tasksByColumn[cid] || []).some(t => t._id === taskId));
    if (!fromColumnId) return;

    const fromList = tasksByColumn[fromColumnId] || [];
    const toList = tasksByColumn[toColumnId] || [];

    // Tarea que movemos
    const moving = fromList.find(t => t._id === taskId);
    if (!moving) return;

    // Si es la misma columna, ajustar el índice de destino
    if (fromColumnId === toColumnId) {
      const currentIndex = fromList.findIndex(t => t._id === taskId);
      if (currentIndex === -1) return;
      
      // Si movemos hacia abajo, el índice de destino debe ajustarse
      if (currentIndex < destIndex) {
        destIndex = destIndex - 1;
      }
    }

    // Calcular nueva posición (before/after)
    const before = toList[destIndex - 1]?.position;
    const after = toList[destIndex]?.position;
    const newPosition = computeNewPosition(toList.length, destIndex, before, after);

    // Optimistic UI
    moveTaskLocally(taskId, fromColumnId, toColumnId, newPosition);

    try {
      await TasksAPI.move(taskId, { columnId: toColumnId, position: newPosition });
      // El evento realtime 'task.moved' hará la reconciliación final.
    } catch (err) {
      // (Opcional) podrías recargar tareas de la columna si quieres deshacer
      // o mostrar un toast de error.
      console.error('Move failed', err);
    }
    setActiveTaskId(null);
    setActiveColumnId(null);
  };

  const onDragCancel = () => {
    setActiveTaskId(null);
    setActiveColumnId(null);
  };

  const toggleFieldSelection = (field: ExportField) => {
    setSelectedFields(current =>
      current.includes(field)
        ? current.filter(item => item !== field)
        : [...current, field],
    );
  };

  const handleCancelExport = () => {
    setShowExportPanel(false);
    setExportFormError(null);
    setExportBusy(false);
  };

  const handleExportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (exportBusy) return;

    const cleanEmail = exportEmail.trim();
    if (!cleanEmail) {
      setExportFormError('Ingresa un correo de destino.');
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      setExportFormError('Proporciona un correo electrónico válido.');
      return;
    }

    if (!selectedFields.length) {
      setExportFormError('Selecciona al menos un campo para exportar.');
      return;
    }

    setExportBusy(true);
    setExportFormError(null);

    try {
      const response = await ExportAPI.requestBacklog({
        boardId,
        to: cleanEmail,
        fields: selectedFields,
      });
      setLastExport(response);
      setExportNotice({
        type: 'info',
        message: `Exportación solicitada. Enviaremos el CSV a ${response.to}.`,
      });
      setShowExportPanel(false);
    } catch (err) {
      console.error('Request export failed', err);
      setExportFormError('No se pudo solicitar la exportación. Intenta nuevamente.');
    } finally {
      setExportBusy(false);
    }
  };

  const createQuickTask = async () => {
    const firstColumn = sortedColumns[0];
    if (!firstColumn) {
      setQuickTaskError('Crea una columna antes de agregar tareas.');
      return;
    }

    const existingTasks = [...(sortedTasksByColumn[firstColumn._id] || [])];
    const before = existingTasks[existingTasks.length - 1]?.position;
    const position = computeNewPosition(existingTasks.length, existingTasks.length, before, undefined);
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      _id: tempId,
      boardId,
      columnId: firstColumn._id,
      title: 'Nueva tarea',
      position,
    };

    setQuickTaskBusy(true);
    setQuickTaskError(null);
    upsertTask(optimisticTask);

    try {
      const created = await TasksAPI.create({
        boardId,
        columnId: firstColumn._id,
        title: 'Nueva tarea',
        position,
      });
      removeTask(tempId, firstColumn._id);
      if (created) {
        upsertTask(created);
      } else {
        setQuickTaskError('No se pudo crear la tarea rápida. Intenta nuevamente.');
      }
    } catch (err) {
      console.error('Quick create task failed', err);
      removeTask(tempId, firstColumn._id);
      setQuickTaskError('No se pudo crear la tarea rápida. Intenta nuevamente.');
    } finally {
      setQuickTaskBusy(false);
    }
  };

  const getColumnTasks = (columnId: string, excludeId?: string) => {
    const list = sortedTasksByColumn[columnId] || [];
    return excludeId ? list.filter(task => task._id !== excludeId) : list;
  };

  const closeTaskModal = () => {
    setTaskError(null);
    setTaskModal(null);
  };

  const handleCreateTaskRequest = (columnId: string) => {
    setTaskError(null);
    setTaskModal({ mode: 'create', columnId });
  };

  const handleOpenTask = (task: Task) => {
    setTaskError(null);
    setTaskModal({ mode: 'edit', task });
  };

  const computePlacementPosition = (
    columnId: string,
    placement: 'start' | 'end',
    excludeId?: string,
  ) => {
    const list = getColumnTasks(columnId, excludeId);
    const index = placement === 'start' ? 0 : list.length;
    const before = placement === 'end' ? list[list.length - 1]?.position : undefined;
    const after = placement === 'start' ? list[0]?.position : undefined;
    return computeNewPosition(list.length, index, before, after);
  };

  const handleSubmitTask = async (values: TaskFormValues) => {
    if (!taskModal) return;
    const columnExists = sortedColumns.some(col => col._id === values.columnId);
    if (!columnExists) {
      setTaskError('La columna seleccionada ya no existe. Actualiza la página.');
      return;
    }

    const cleanTitle = values.title.trim();
    const cleanDescription = values.description.trim();
    const cleanAssignee = values.assignee.trim();

    if (!cleanTitle) {
      setTaskError('El título es obligatorio.');
      return;
    }

    setTaskBusy(true);
    setTaskError(null);

    if (taskModal.mode === 'create') {
      try {
        const placement = values.placement === 'start' ? 'start' : 'end';
        const position = computePlacementPosition(values.columnId, placement);
        const created = await TasksAPI.create({
          boardId,
          columnId: values.columnId,
          title: cleanTitle,
          description: cleanDescription ? cleanDescription : undefined,
          assignee: cleanAssignee ? cleanAssignee : undefined,
          position,
        });
        upsertTask(created);
        closeTaskModal();
      } catch (err) {
        console.error('Create task failed', err);
        setTaskError('No se pudo crear la tarea. Intenta nuevamente.');
      } finally {
        setTaskBusy(false);
      }
      return;
    }

    const originalTask = taskModal.task;

    try {
      const updated = await TasksAPI.update(originalTask._id, {
        title: cleanTitle,
        description: cleanDescription ? cleanDescription : undefined,
        assignee: cleanAssignee ? cleanAssignee : undefined,
      });
      if (updated) {
        upsertTask(updated);
      }

      const columnChanged = values.columnId !== originalTask.columnId;
      const placementChanged = values.placement !== 'keep';

      if (columnChanged || placementChanged) {
        const placement = values.placement === 'keep' ? 'end' : values.placement;
        const position = computePlacementPosition(values.columnId, placement, originalTask._id);
        const moved = await TasksAPI.move(originalTask._id, {
          columnId: values.columnId,
          position,
        });
        removeTask(originalTask._id, originalTask.columnId);
        if (moved) {
          upsertTask(moved);
        }
      }

      closeTaskModal();
    } catch (err) {
      console.error('Update task failed', err);
      setTaskError('No se pudo guardar la tarea. Intenta de nuevo.');
    } finally {
      setTaskBusy(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskModal || taskModal.mode !== 'edit') return;
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    const task = taskModal.task;
    setTaskBusy(true);
    setTaskError(null);
    try {
      await TasksAPI.remove(task._id);
      removeTask(task._id, task.columnId);
      closeTaskModal();
    } catch (err) {
      console.error('Delete task failed', err);
      setTaskError('No se pudo eliminar la tarea. Intenta nuevamente.');
    } finally {
      setTaskBusy(false);
    }
  };

  const startRenaming = () => {
    setBoardActionError(null);
    setRenameValue(board.name);
    setIsRenaming(true);
  };

  const cancelRenaming = () => {
    setBoardActionError(null);
    setIsRenaming(false);
    setRenameValue(board.name);
  };

  const handleRenameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = renameValue.trim();
    if (!nextName) {
      setBoardActionError('El título del tablero no puede estar vacío.');
      return;
    }
    if (nextName === board.name) {
      setIsRenaming(false);
      return;
    }

    setBoardActionError(null);
    setRenameBusy(true);
    try {
      const updated = await BoardsAPI.update(boardId, { name: nextName });
      onBoardUpdate(updated);
      setIsRenaming(false);
      setRenameValue(nextName);
    } catch (err) {
      console.error('Rename board failed', err);
      setBoardActionError('No se pudo renombrar el tablero. Intenta nuevamente.');
    } finally {
      setRenameBusy(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (deleteBusy) return;
    if (!confirm('¿Seguro que deseas eliminar este tablero? Esta acción no se puede deshacer.')) {
      return;
    }
    setBoardActionError(null);
    setDeleteBusy(true);
    try {
      await BoardsAPI.remove(boardId);
      onBoardDeleted(boardId);
    } catch (err) {
      console.error('Delete board failed', err);
      setBoardActionError('No se pudo eliminar el tablero. Intenta nuevamente.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCreateColumn = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;

    const before = sortedColumns[sortedColumns.length - 1]?.position;
    const position = computeNewPosition(sortedColumns.length, sortedColumns.length, before, undefined);

    setCreatingColumn(true);
    setCreateError(null);
    try {
      const created = await ColumnsAPI.create({ boardId, title, position });
      upsertColumn(created);
      resetColumnForm();
    } catch (err) {
      console.error('Create column failed', err);
      setCreateError('No se pudo crear la columna. Intenta nuevamente.');
    } finally {
      setCreatingColumn(false);
    }
  };

  const handleRenameColumn = async (id: string, title: string) => {
    const updated = await ColumnsAPI.update(id, { title });
    if (!updated) {
      throw new Error('Column not found');
    }
    upsertColumn(updated);
  };

  const handleDeleteColumn = async (id: string) => {
    await ColumnsAPI.remove(id);
    removeColumn(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              <span aria-hidden>←</span> Todos los tableros
            </button>
            <div className="flex flex-wrap items-center gap-3">
              {isRenaming ? (
                <form onSubmit={handleRenameSubmit} className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={event => setRenameValue(event.target.value)}
                    disabled={renameBusy}
                    autoFocus
                    className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-lg font-semibold text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={renameBusy}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
                    >
                      {renameBusy ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelRenaming}
                      disabled={renameBusy}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-slate-900">{board.name}</h1>
                  <button
                    type="button"
                    onClick={startRenaming}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
                  >
                    Editar título
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-500">Propietario: {board.owner}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={createQuickTask}
              disabled={!columns.length || quickTaskBusy || deleteBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
            >
              + Tarea rápida
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowExportPanel(prev => !prev);
                  setExportFormError(null);
                  setExportBusy(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
              >
                Exportar backlog
              </button>
              {showExportPanel && (
                <form
                  onSubmit={handleExportSubmit}
                  className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl"
                >
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Enviar backlog por correo</h3>
                  <label className="mb-3 block text-sm font-medium text-slate-700">
                    Correo de destino
                    <input
                      type="email"
                      value={exportEmail}
                      onChange={event => {
                        setExportEmail(event.target.value);
                        setExportFormError(null);
                      }}
                      disabled={exportBusy}
                      placeholder="persona@empresa.com"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                  <fieldset className="mb-3">
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Campos a incluir
                    </legend>
                    <div className="flex max-h-36 flex-col gap-2 overflow-y-auto pr-1">
                      {DEFAULT_EXPORT_FIELDS.map(field => {
                        const meta = EXPORT_FIELD_LABELS[field];
                        const checked = selectedFields.includes(field);
                        return (
                          <label
                            key={field}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/60"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleFieldSelection(field)}
                              disabled={exportBusy}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
                            />
                            <span>
                              <span className="font-semibold text-slate-900">{meta.label}</span>
                              <span className="block text-xs text-slate-500">{meta.description}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  {exportFormError && (
                    <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {exportFormError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelExport}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={exportBusy}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-200"
                    >
                      {exportBusy ? 'Enviando…' : 'Solicitar exportación'}
                    </button>
                  </div>
                  {lastExport && lastExport.status === 'pending' && (
                    <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                      Última solicitud en curso: {new Date(lastExport.requestedAt).toLocaleString()}
                    </p>
                  )}
                </form>
              )}
            </div>
            <button
              type="button"
              onClick={handleDeleteBoard}
              disabled={deleteBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleteBusy ? 'Eliminando...' : 'Eliminar tablero'}
            </button>
          </div>
        </header>

        {boardActionError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-sm">{boardActionError}</p>
        )}

        {exportNotice && (
          <p
            className={`rounded-xl border px-4 py-2 text-sm shadow-sm ${EXPORT_NOTICE_STYLES[exportNotice.type]}`}
          >
            {exportNotice.message}
          </p>
        )}

        {quickTaskError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 shadow-sm">{quickTaskError}</p>
        )}

        <main className="flex-1">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Cargando columnas...
            </div>
          ) : !sortedColumns.length ? (
            isAddingColumn ? (
              <ColumnForm
                title={newColumnTitle}
                error={createError}
                busy={creatingColumn}
                onSubmit={handleCreateColumn}
                onCancel={resetColumnForm}
                onTitleChange={value => {
                  setNewColumnTitle(value);
                  setCreateError(null);
                }}
                className="mx-auto w-full max-w-md p-6"
              />
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-sm text-slate-500">
                <p>Aún no hay columnas en este tablero.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(true);
                    setCreateError(null);
                    setNewColumnTitle('');
                  }}
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  + Crear la primera columna
                </button>
              </div>
            )
          ) : (
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
              <div className="overflow-x-auto pb-4">
                <div className="flex items-start gap-4">
                  <SortableContext
                    items={sortedColumns.map(col => columnId(col._id))}
                    strategy={horizontalListSortingStrategy}
                  >
                    {sortedColumns.map(col => (
                      <ColumnView
                        key={col._id}
                        column={col}
                        tasks={sortedTasksByColumn[col._id] || []}
                        onRename={handleRenameColumn}
                        onDelete={handleDeleteColumn}
                        onCreateTask={handleCreateTaskRequest}
                        onOpenTask={handleOpenTask}
                      />
                    ))}
                  </SortableContext>
                  <div className="w-72 flex-shrink-0">
                    {isAddingColumn ? (
                      <ColumnForm
                        title={newColumnTitle}
                        error={createError}
                        busy={creatingColumn}
                        onSubmit={handleCreateColumn}
                        onCancel={resetColumnForm}
                        onTitleChange={value => {
                          setNewColumnTitle(value);
                          setCreateError(null);
                        }}
                        className="h-full justify-between p-4"
                        headingClassName="text-sm"
                        footerClassName="mt-4"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(true);
                          setCreateError(null);
                          setNewColumnTitle('');
                        }}
                        className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
                      >
                        + Agregar columna
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <DragOverlay>
                {activeTaskId ? (
                  (() => {
                    const task = Object.values(tasksByColumn)
                      .flat()
                      .find(t => t._id === activeTaskId);
                    return task ? (
                      <div className="w-72 cursor-grabbing">
                        <TaskCard task={task} />
                      </div>
                    ) : null;
                  })()
                ) : activeColumnId ? (
                  (() => {
                    const column = columns.find(col => col._id === activeColumnId);
                    if (!column) return null;
                    const taskCount = (tasksByColumn[column._id] || []).length;
                    return (
                      <div className="w-72 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-lg">
                        <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                          {column.title}
                        </div>
                        <p className="text-xs text-slate-400">{taskCount} tarea{taskCount === 1 ? '' : 's'}</p>
                      </div>
                    );
                  })()
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </main>
      </div>
      {taskModal && sortedColumns.length > 0 && (
        <TaskModal
          mode={taskModal.mode}
          columns={sortedColumns}
          initialValues={
            taskModal.mode === 'create'
              ? {
                  title: '',
                  description: '',
                  assignee: '',
                  columnId:
                    sortedColumns.find(col => col._id === taskModal.columnId)?._id || sortedColumns[0]._id,
                  placement: 'end',
                }
              : {
                  title: taskModal.task.title,
                  description: taskModal.task.description || '',
                  assignee: taskModal.task.assignee || '',
                  columnId:
                    sortedColumns.find(col => col._id === taskModal.task.columnId)?._id || sortedColumns[0]._id,
                  placement: 'keep',
                }
          }
          busy={taskBusy}
          error={taskError}
          onClose={closeTaskModal}
          onSubmit={handleSubmitTask}
          onDelete={taskModal.mode === 'edit' ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
};
