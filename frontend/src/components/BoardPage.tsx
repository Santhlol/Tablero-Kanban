import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { ColumnsAPI, TasksAPI } from '../api/http';
import { useBoard } from '../store/board';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { ColumnView } from './Column';
import { columnId, isTaskId, isColumnId, rawId } from '../dnd/utils';
import { computeNewPosition } from '../dnd/utils';
import type { BoardSummary } from '../types/board';

type BoardPageProps = {
  board: BoardSummary;
  onBack: () => void;
};

export const BoardPage: React.FC<BoardPageProps> = ({ board, onBack }) => {
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
  } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [creatingColumn, setCreatingColumn] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  useRealtimeBoard(boardId);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setColumns([]);
    setTasks([]);
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setCreateError(null);

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
  };

  const createQuickTask = async () => {
    const firstColumn = columns[0];
    if (!firstColumn) return;
    await TasksAPI.create({
      boardId,
      columnId: firstColumn._id,
      title: 'Nueva tarea',
      position: (tasksByColumn[firstColumn._id]?.length || 0) * 10,
    });
  };

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);

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
      setIsAddingColumn(false);
      setNewColumnTitle('');
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
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{board.name}</h1>
              <p className="text-sm text-slate-500">Propietario: {board.owner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={createQuickTask}
            disabled={!columns.length}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
          >
            + Tarea rápida
          </button>
        </header>

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
              <form
                onSubmit={handleCreateColumn}
                className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-6 text-sm shadow-sm"
              >
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-indigo-700">Nueva columna</h2>
                  <input
                    value={newColumnTitle}
                    onChange={event => setNewColumnTitle(event.target.value)}
                    autoFocus
                    placeholder="Nombre de la columna"
                    className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    disabled={creatingColumn}
                  />
                  {createError && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{createError}</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                      setCreateError(null);
                    }}
                    className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-700"
                    disabled={creatingColumn}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingColumn || !newColumnTitle.trim()}
                    className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
                  >
                    Crear
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-sm text-slate-500">
                <p>Aún no hay columnas en este tablero.</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(true);
                    setCreateError(null);
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
                          tasks={(tasksByColumn[col._id] || []).slice().sort((a,b)=>a.position-b.position)}
                          onRename={handleRenameColumn}
                          onDelete={handleDeleteColumn}
                        />
                      ))}
                    </SortableContext>
                    <div className="w-72 flex-shrink-0">
                    {isAddingColumn ? (
                      <form
                        onSubmit={handleCreateColumn}
                        className="flex h-full flex-col justify-between rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3">
                          <h2 className="text-sm font-semibold text-indigo-700">Nueva columna</h2>
                          <input
                            value={newColumnTitle}
                            onChange={event => setNewColumnTitle(event.target.value)}
                            autoFocus
                            placeholder="Nombre de la columna"
                            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            disabled={creatingColumn}
                          />
                          {createError && (
                            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{createError}</p>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingColumn(false);
                              setNewColumnTitle('');
                              setCreateError(null);
                            }}
                            className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-700"
                            disabled={creatingColumn}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={creatingColumn || !newColumnTitle.trim()}
                            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
                          >
                            Crear
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(true);
                          setCreateError(null);
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
    </div>
  );
};
