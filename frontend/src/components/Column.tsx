import React, { useEffect, useMemo, useState } from 'react';
import type { Column, Task } from '../store/board';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { columnId, taskId } from '../dnd/utils';
import { DraggableTask } from './DraggableTask';
import { CSS } from '@dnd-kit/utilities';

type ColumnViewProps = {
  column: Column;
  tasks: Task[];
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateTask: (columnId: string) => void;
  onOpenTask: (task: Task) => void;
};

export const ColumnView: React.FC<ColumnViewProps> = ({
  column,
  tasks,
  onRename,
  onDelete,
  onCreateTask,
  onOpenTask,
}) => {
  const { setNodeRef, attributes, listeners, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId(column._id),
    data: { type: 'column' },
  });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
  }), [transform, transition]);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  const submitRename = async (evt: React.FormEvent) => {
    evt.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === column.title) {
      setIsEditing(false);
      setTitle(column.title);
      setError(null);
      return;
    }

    setRenaming(true);
    setError(null);
    try {
      await onRename(column._id, nextTitle);
      setIsEditing(false);
    } catch (err) {
      console.error('Rename column failed', err);
      setError('No se pudo renombrar la columna. Intenta de nuevo.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la columna "${column.title}" y todas sus tareas?`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await onDelete(column._id);
    } catch (err) {
      console.error('Delete column failed', err);
      setError('No se pudo eliminar la columna. Intenta de nuevo.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-72 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm backdrop-blur transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-indigo-200' : ''
      }`}
      {...attributes}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          {isEditing ? (
            <form onSubmit={submitRename} className="flex flex-col gap-2">
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                autoFocus
                disabled={renaming}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="submit"
                  disabled={renaming || !title.trim()}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setTitle(column.title);
                    setError(null);
                  }}
                  className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-700"
                  disabled={renaming}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...listeners}
              className="flex w-full cursor-grab items-center justify-between rounded-md border border-transparent bg-transparent px-1 py-1 text-left text-sm font-semibold uppercase tracking-wide text-slate-600 transition active:cursor-grabbing"
            >
              <span className="truncate">{column.title}</span>
              <span className="ml-2 text-xs text-slate-400">⋮⋮</span>
            </button>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setTimeout(() => setTitle(column.title), 0);
              }}
              className="rounded-md px-2 py-1 font-medium text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700"
            >
              Renombrar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md px-2 py-1 font-medium text-rose-500 transition hover:bg-rose-100/70 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Borrar
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <SortableContext
        id={columnId(column._id)}
        items={tasks.map(t => taskId(t._id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {tasks.map(t => (
            <DraggableTask key={t._id} task={t} onOpen={onOpenTask} />
          ))}
          {!tasks.length && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white/40 p-3 text-xs text-slate-400">
              Arrastra tareas aquí
            </p>
          )}
          <button
            type="button"
            onClick={() => onCreateTask(column._id)}
            className="flex w-full items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/60 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            + Nueva tarea
          </button>
        </div>
      </SortableContext>
    </div>
  );
};
