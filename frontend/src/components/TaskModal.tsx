import React, { useEffect, useMemo, useState } from 'react';
import type { Column } from '../store/board';

type PlacementOption = 'start' | 'end' | 'keep';

export type TaskFormValues = {
  title: string;
  description: string;
  assignee: string;
  columnId: string;
  placement: PlacementOption;
};

type TaskModalProps = {
  mode: 'create' | 'edit';
  columns: Column[];
  initialValues: TaskFormValues;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => void;
  onDelete?: () => void;
};

export const TaskModal: React.FC<TaskModalProps> = ({
  mode,
  columns,
  initialValues,
  busy,
  error,
  onClose,
  onSubmit,
  onDelete,
}) => {
  const [form, setForm] = useState<TaskFormValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const placementOptions = useMemo(() => {
    if (mode === 'create') {
      return [
        { value: 'start' as PlacementOption, label: 'Al inicio de la columna' },
        { value: 'end' as PlacementOption, label: 'Al final de la columna' },
      ];
    }
    return [
      { value: 'keep' as PlacementOption, label: 'Mantener posición actual' },
      { value: 'start' as PlacementOption, label: 'Mover al inicio de la columna' },
      { value: 'end' as PlacementOption, label: 'Mover al final de la columna' },
    ];
  }, [mode]);

  const handleChange = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const submit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      assignee: form.assignee.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-1 text-slate-400 transition hover:text-slate-600"
          aria-label="Cerrar"
          disabled={busy}
        >
          ✕
        </button>
        <form onSubmit={submit} className="space-y-6">
          <header className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">
              {mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
            </h2>
            <p className="text-sm text-slate-500">
              Completa la información de la tarea y elige dónde colocarla dentro del tablero.
            </p>
          </header>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              Título
              <input
                value={form.title}
                onChange={event => handleChange('title', event.target.value)}
                required
                placeholder="Ej. Revisar pull request"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={busy}
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              Descripción
              <textarea
                value={form.description}
                onChange={event => handleChange('description', event.target.value)}
                rows={4}
                placeholder="Añade contexto, enlaces o pasos a seguir"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={busy}
              />
            </label>

            <label className="block text-sm font-medium text-slate-600">
              Responsable
              <input
                value={form.assignee}
                onChange={event => handleChange('assignee', event.target.value)}
                placeholder="Nombre o correo de la persona asignada"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={busy}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Columna
                <select
                  value={form.columnId}
                  onChange={event => handleChange('columnId', event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  disabled={busy}
                >
                  {columns.map(col => (
                    <option key={col._id} value={col._id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-600">
                Ubicación en la columna
                <select
                  value={form.placement}
                  onChange={event => handleChange('placement', event.target.value as PlacementOption)}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  disabled={busy}
                >
                  {placementOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3">
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
              >
                Eliminar tarea
              </button>
            )}

            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
                disabled={busy || !form.title.trim()}
              >
                {mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
};
