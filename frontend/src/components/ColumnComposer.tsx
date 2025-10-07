import React from 'react';

export type ColumnComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (title: string) => Promise<void> | void;
  onCancel: () => void;
  busy: boolean;
  error?: string | null;
  variant: 'empty' | 'inline';
  autoFocus?: boolean;
};

export const ColumnComposer: React.FC<ColumnComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  error,
  variant,
  autoFocus,
}) => {
  const containerClass =
    variant === 'empty'
      ? 'mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-6 text-sm shadow-sm'
      : 'flex h-full flex-col justify-between rounded-2xl border border-dashed border-indigo-300 bg-white/80 p-4 shadow-sm';

  const buttonGroupClass =
    variant === 'empty'
      ? 'flex items-center justify-end gap-2 text-sm'
      : 'mt-4 flex items-center justify-end gap-2 text-sm';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className={containerClass}>
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-indigo-700">Nueva columna</h2>
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          autoFocus={autoFocus}
          placeholder="Nombre de la columna"
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          disabled={busy}
        />
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
      </div>
      <div className={buttonGroupClass}>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={busy}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-200"
        >
          Crear
        </button>
      </div>
    </form>
  );
};
