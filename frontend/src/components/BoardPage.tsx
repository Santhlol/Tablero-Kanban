import React, { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { ColumnsAPI, TasksAPI } from '../api/http';
import { useBoard } from '../store/board';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { ColumnView } from './Column';
import { isTaskId, isColumnId, rawId } from '../dnd/utils';
import { computeNewPosition } from '../dnd/utils';
import type { BoardSummary } from '../types/board';

type BoardPageProps = {
  board: BoardSummary;
  onBack: () => void;
};

export const BoardPage: React.FC<BoardPageProps> = ({ board, onBack }) => {
  const boardId = board._id;
  const { columns, tasksByColumn, setColumns, setTasks, moveTaskLocally } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useRealtimeBoard(boardId);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setColumns([]);
    setTasks([]);

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
    if (!isTaskId(activeId)) return; // sólo arrastramos tareas

    const taskId = rawId(activeId);
    const overId = String(over.id);

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

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

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
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-sm text-slate-500">
              Aún no hay columnas en este tablero.
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={onDragEnd}>
              <div className="overflow-x-auto pb-4">
                <div className="flex items-start gap-4">
                  {sortedColumns.map(col => (
                    <ColumnView
                      key={col._id}
                      column={col}
                      tasks={(tasksByColumn[col._id] || []).slice().sort((a,b)=>a.position-b.position)}
                    />
                  ))}
                </div>
              </div>
            </DndContext>
          )}
        </main>
      </div>
    </div>
  );
};
