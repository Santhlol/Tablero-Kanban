import React, { useEffect } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { BoardsAPI, ColumnsAPI, TasksAPI } from '../api/http';
import { useBoard } from '../store/board';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
import { ColumnView } from './Column';
import type { Task } from '../store/board';
import { isTaskId, isColumnId, rawId } from '../dnd/utils';
import { arrayMove } from '@dnd-kit/sortable';
import { computeNewPosition } from '../dnd/utils';

export const BoardPage: React.FC<{ boardId: string }> = ({ boardId }) => {
  const { columns, tasksByColumn, setColumns, setTasks, moveTaskLocally } = useBoard();
  useRealtimeBoard(boardId);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // active.id y over.id son DndId: "task:<id>" o "column:<id>"
    if (!isTaskId(String(active.id))) return; // sólo arrastramos tareas

    const taskId = rawId(String(active.id) as any);
    const overId = String(over.id);

    // Determinar columna destino y destino index
    let toColumnId: string;
    let destIndex: number;

    if (isTaskId(overId)) {
      const overTaskId = rawId(overId as any);
      // Encuentra la columna que contiene la tarea overTaskId
      const entry = Object.entries(tasksByColumn).find(([, list]) => list.some(t => t._id === overTaskId));
      if (!entry) return;
      toColumnId = entry[0];
      const list = tasksByColumn[toColumnId] || [];
      destIndex = list.findIndex(t => t._id === overTaskId);
    } else if (isColumnId(overId)) {
      toColumnId = rawId(overId as any);
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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <h2 style={{ margin: 0 }}>Board #{boardId}</h2>
        <button onClick={createQuickTask} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
          + Tarea
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', overflowX: 'auto' }}>
          {columns.map(col => (
            <ColumnView
              key={col._id}
              column={col}
              tasks={(tasksByColumn[col._id] || []).slice().sort((a,b)=>a.position-b.position)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};
