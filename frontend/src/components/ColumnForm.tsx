import React from 'react';

type ColumnFormProps = {
  title: string;
  error?: string | null;
  busy?: boolean;
  className?: string;
  footerClassName?: string;
  headingClassName?: string;
  onTitleChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export const ColumnForm: React.FC<ColumnFormProps> = ({
  title,
  error,
  busy = false,
  className = '',
  footerClassName = '',
  headingClassName = 'text-base',
  onTitleChange,
  onCancel,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className={`flex flex-col gap-4 rounded-2xl border border-dashed border-indigo-300 bg-white/80 text-sm shadow-sm ${className}`}
  >
    <div className="space-y-3">
      <h2 className={`${headingClassName} font-semibold text-indigo-700`}>Nueva columna</h2>
      <input
        value={title}
        onChange={event => onTitleChange(event.target.value)}
        autoFocus
        placeholder="Nombre de la columna"
        className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        disabled={busy}
      />
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
    </div>
    <div className={`flex items-center justify-end gap-2 text-sm ${footerClassName}`}>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-700"
        disabled={busy}
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
      >
        Crear
      </button>
    </div>
  </form>
);

