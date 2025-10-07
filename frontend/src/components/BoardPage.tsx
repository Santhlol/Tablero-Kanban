import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ColumnsAPI, TasksAPI } from '../api/http';
import { ColumnView } from './Column';
import { columnId, isColumnId, isTaskId, rawId } from '../dnd/utils';
import { computeNewPosition } from '../dnd/utils';
import type { BoardSummary } from '../types/board';
import type { Column, Task } from '../store/board';
import { useBoard } from '../store/board';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { useBoardData, boardQueryKeys } from '../hooks/useBoardData';
import { ColumnComposer } from './ColumnComposer';
import { TaskModal, type TaskFormValues } from './TaskModal';

const sortTasksForCache = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    if (a.columnId === b.columnId) {
      return a.position - b.position;
    }
    return a.columnId.localeCompare(b.columnId);
  });

type BoardPageProps = {
  board: BoardSummary;
  onBack: () => void;
};

export const BoardPage: React.FC<BoardPageProps> = ({ board, onBack }) => {
  const boardId = board._id;
  const columns = useBoard(state => state.columns);
  const tasksByColumn = useBoard(state => state.tasksByColumn);
  const setColumnsState = useBoard(state => state.setColumns);
  const setTasksState = useBoard(state => state.setTasks);
  const upsertColumn = useBoard(state => state.upsertColumn);
  const updateColumnState = useBoard(state => state.updateColumn);
  const removeColumn = useBoard(state => state.removeColumn);
  const upsertTask = useBoard(state => state.upsertTask);
  const removeTask = useBoard(state => state.removeTask);
  const moveTaskLocally = useBoard(state => state.moveTaskLocally);
  const resetBoardState = useBoard(state => state.reset);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState<
    | { mode: 'create'; columnId: string }
    | { mode: 'edit'; task: Task }
    | null
  >(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useRealtimeBoard(boardId);
  const { columnsQuery, tasksQuery } = useBoardData(boardId);

  const loadError = columnsQuery.error ?? tasksQuery.error;
  const loading = columnsQuery.isLoading || tasksQuery.isLoading;
  const errorMessage = loadError
    ? 'No se pudieron cargar las columnas del tablero. Intenta recargar.'
    : null;

  useEffect(() => {
    if (loadError) {
      console.error('Error cargando tablero', loadError);
      setColumnsState([]);
      setTasksState([]);
    }
  }, [loadError, setColumnsState, setTasksState]);

  useEffect(() => {
    resetBoardState();
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setCreateError(null);
    setTaskModal(null);
    setTaskError(null);
  }, [boardId, resetBoardState]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns],
  );

  const sortedTasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const [key, list] of Object.entries(tasksByColumn)) {
      map[key] = [...list].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasksByColumn]);

  const getColumnTasks = (columnId: string, excludeId?: string) => {
    const list = sortedTasksByColumn[columnId] || [];
    return excludeId ? list.filter(task => task._id !== excludeId) : list;
  };

  const createColumnMutation = useMutation({
    mutationFn: ({ title, position }: { title: string; position: number }) =>
      ColumnsAPI.create({ boardId, title, position }),
    onMutate: () => {
      setCreateError(null);
    },
    onSuccess: column => {
      setCreateError(null);
      upsertColumn(column);
      queryClient.setQueryData<Column[]>(boardQueryKeys.columns(boardId), previous => {
        if (!previous) return previous;
        const next = previous.filter(item => item._id !== column._id);
        next.push(column);
        next.sort((a, b) => a.position - b.position);
        return next;
      });
    },
    onError: () => {
      setCreateError('No se pudo crear la columna. Intenta nuevamente.');
    },
  });

  const updateColumnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Column, 'title' | 'position'>> }) =>
      ColumnsAPI.update(id, data),
    onSuccess: column => {
      upsertColumn(column);
      queryClient.setQueryData<Column[]>(boardQueryKeys.columns(boardId), previous => {
        if (!previous) return previous;
        const next = previous.filter(item => item._id !== column._id);
        next.push(column);
        next.sort((a, b) => a.position - b.position);
        return next;
      });
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => ColumnsAPI.remove(id),
    onSuccess: (_, variables) => {
      removeColumn(variables.id);
      queryClient.setQueryData<Column[]>(boardQueryKeys.columns(boardId), previous => {
        if (!previous) return previous;
        return previous.filter(item => item._id !== variables.id);
      });
      queryClient.setQueryData<Task[]>(boardQueryKeys.tasks(boardId), previous => {
        if (!previous) return previous;
        return previous.filter(task => task.columnId !== variables.id);
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: Omit<Task, '_id'>) => TasksAPI.create(payload),
    onSuccess: task => {
      upsertTask(task);
      queryClient.setQueryData<Task[]>(boardQueryKeys.tasks(boardId), previous => {
        if (!previous) return previous;
        const next = previous.filter(item => item._id !== task._id);
        next.push(task);
        return sortTasksForCache(next);
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Pick<Task, 'title' | 'description' | 'assignee'>> }) =>
      TasksAPI.update(id, payload),
    onSuccess: task => {
      if (!task) return;
      upsertTask(task);
      queryClient.setQueryData<Task[]>(boardQueryKeys.tasks(boardId), previous => {
        if (!previous) return previous;
        const next = previous.filter(item => item._id !== task._id);
        next.push(task);
        return sortTasksForCache(next);
      });
    },
  });

  type MoveVariables = { id: string; columnId: string; position: number; fromColumnId?: string };

  const moveTaskMutation = useMutation({
    mutationFn: ({ id, columnId, position }: MoveVariables) => TasksAPI.move(id, { columnId, position }),
    onSuccess: (task, variables) => {
      if (variables.fromColumnId && variables.fromColumnId !== variables.columnId) {
        removeTask(variables.id, variables.fromColumnId);
      }
      if (task) {
        upsertTask(task);
        queryClient.setQueryData<Task[]>(boardQueryKeys.tasks(boardId), previous => {
          if (!previous) return previous;
          const next = previous.filter(item => item._id !== task._id);
          next.push(task);
          return sortTasksForCache(next);
        });
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => TasksAPI.remove(id),
    onSuccess: (_, variables) => {
      removeTask(variables.id, variables.columnId);
      queryClient.setQueryData<Task[]>(boardQueryKeys.tasks(boardId), previous => {
        if (!previous) return previous;
        return previous.filter(task => task._id !== variables.id);
      });
    },
  });

  useEffect(() => {
    createColumnMutation.reset();
    createTaskMutation.reset();
    updateTaskMutation.reset();
    moveTaskMutation.reset();
    deleteTaskMutation.reset();
  }, [
    boardId,
    createColumnMutation,
    createTaskMutation,
    deleteTaskMutation,
    moveTaskMutation,
    updateTaskMutation,
  ]);

  const taskBusy =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    moveTaskMutation.isPending ||
    deleteTaskMutation.isPending;

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

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

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

      updateColumnState(activeColumnId, { position: newPosition });

      try {
        await updateColumnMutation.mutateAsync({ id: activeColumnId, data: { position: newPosition } });
      } catch (error) {
        console.error('Move column failed', error);
        setColumnsState(ordered);
      }
      return;
    }

    if (!isTaskId(activeId)) return;

    const taskId = rawId(activeId);

    let toColumnId: string;
    let destIndex: number;

    if (isTaskId(overId)) {
      const overTaskId = rawId(overId);
      const entry = Object.entries(tasksByColumn).find(([, list]) => list.some(t => t._id === overTaskId));
      if (!entry) return;
      toColumnId = entry[0];
      const list = tasksByColumn[toColumnId] || [];
      destIndex = list.findIndex(t => t._id === overTaskId);
    } else if (isColumnId(overId)) {
      toColumnId = rawId(overId);
      const list = tasksByColumn[toColumnId] || [];
      destIndex = list.length;
    } else {
      return;
    }

    const fromColumnId = Object.keys(tasksByColumn).find(cid => (tasksByColumn[cid] || []).some(t => t._id === taskId));
    if (!fromColumnId) return;

    const fromList = tasksByColumn[fromColumnId] || [];
    const moving = fromList.find(t => t._id === taskId);
    if (!moving) return;

    const toList = tasksByColumn[toColumnId] || [];
    const before = toList[destIndex - 1]?.position;
    const after = toList[destIndex]?.position;
    const newPosition = computeNewPosition(toList.length, destIndex, before, after);

    moveTaskLocally(taskId, fromColumnId, toColumnId, newPosition);

    try {
      await moveTaskMutation.mutateAsync({
        id: taskId,
        columnId: toColumnId,
        position: newPosition,
        fromColumnId,
      });
    } catch (error) {
      console.error('Move task failed', error);
    }
  };

  const createQuickTask = async () => {
    const firstColumn = sortedColumns[0];
    if (!firstColumn) return;
    const list = getColumnTasks(firstColumn._id);
    const before = list[list.length - 1]?.position;
    const position = computeNewPosition(list.length, list.length, before, undefined);
    try {
      await createTaskMutation.mutateAsync({
        boardId,
        columnId: firstColumn._id,
        title: 'Nueva tarea',
        position,
      });
    } catch (error) {
      console.error('Create quick task failed', error);
    }
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

    setTaskError(null);

    if (taskModal.mode === 'create') {
      try {
        const placement = values.placement === 'start' ? 'start' : 'end';
        const position = computePlacementPosition(values.columnId, placement);
        await createTaskMutation.mutateAsync({
          boardId,
          columnId: values.columnId,
          title: cleanTitle,
          description: cleanDescription ? cleanDescription : undefined,
          assignee: cleanAssignee ? cleanAssignee : undefined,
          position,
        });
        closeTaskModal();
      } catch (error) {
        console.error('Create task failed', error);
        setTaskError('No se pudo crear la tarea. Intenta nuevamente.');
      }
      return;
    }

    const originalTask = taskModal.task;

    try {
      await updateTaskMutation.mutateAsync({
        id: originalTask._id,
        payload: {
          title: cleanTitle,
          description: cleanDescription ? cleanDescription : undefined,
          assignee: cleanAssignee ? cleanAssignee : undefined,
        },
      });

      const columnChanged = values.columnId !== originalTask.columnId;
      const placementChanged = values.placement !== 'keep';

      if (columnChanged || placementChanged) {
        const placement = values.placement === 'keep' ? 'end' : values.placement;
        const position = computePlacementPosition(values.columnId, placement, originalTask._id);
        await moveTaskMutation.mutateAsync({
          id: originalTask._id,
          columnId: values.columnId,
          position,
          fromColumnId: originalTask.columnId,
        });
      }

      closeTaskModal();
    } catch (error) {
      console.error('Update task failed', error);
      setTaskError('No se pudo guardar la tarea. Intenta de nuevo.');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskModal || taskModal.mode !== 'edit') return;
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    const task = taskModal.task;
    setTaskError(null);
    try {
      await deleteTaskMutation.mutateAsync({ id: task._id, columnId: task.columnId });
      closeTaskModal();
    } catch (error) {
      console.error('Delete task failed', error);
      setTaskError('No se pudo eliminar la tarea. Intenta nuevamente.');
    }
  };

  const handleCreateColumn = async (title: string) => {
    const before = sortedColumns[sortedColumns.length - 1]?.position;
    const position = computeNewPosition(sortedColumns.length, sortedColumns.length, before, undefined);
    try {
      await createColumnMutation.mutateAsync({ title, position });
      setIsAddingColumn(false);
      setNewColumnTitle('');
    } catch {
      /* el mensaje se gestiona en onError */
    }
  };

  const handleRenameColumn = async (id: string, title: string) => {
    await updateColumnMutation.mutateAsync({ id, data: { title } });
  };

  const handleDeleteColumn = async (id: string) => {
    await deleteColumnMutation.mutateAsync({ id });
  };

  const cancelColumnComposer = () => {
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setCreateError(null);
    createColumnMutation.reset();
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
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{board.name}</h1>
              <p className="text-sm text-slate-500">Propietario: {board.owner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={createQuickTask}
            disabled={!sortedColumns.length || taskBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
          >
            + Tarea rápida
          </button>
        </header>

        <main className="flex-1">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 shadow-sm">
              {errorMessage}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Cargando columnas...
            </div>
          ) : !sortedColumns.length ? (
            isAddingColumn ? (
              <ColumnComposer
                value={newColumnTitle}
                onChange={setNewColumnTitle}
                onSubmit={handleCreateColumn}
                onCancel={cancelColumnComposer}
                busy={createColumnMutation.isPending}
                error={createError}
                autoFocus
                variant="empty"
              />
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-sm text-slate-500">
                <p>Aún no hay columnas en este tablero.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(true);
                    setCreateError(null);
                    createColumnMutation.reset();
                  }}
                  className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  + Crear la primera columna
                </button>
              </div>
            )
          ) : (
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
                      <ColumnComposer
                        value={newColumnTitle}
                        onChange={setNewColumnTitle}
                        onSubmit={handleCreateColumn}
                        onCancel={cancelColumnComposer}
                        busy={createColumnMutation.isPending}
                        error={createError}
                        autoFocus
                        variant="inline"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(true);
                          setCreateError(null);
                          createColumnMutation.reset();
                        }}
                        className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm font-semibold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
                      >
                        + Agregar columna
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
