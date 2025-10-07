import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BoardsAPI } from './api/http';
import { BoardPage } from './components/BoardPage';
import type { BoardSummary } from './types/board';
import { useBoard } from './store/board';

type BoardForm = {
  name: string;
  owner: string;
};

export default function App() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BoardForm>({ name: '', owner: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const resetBoard = useBoard(state => state.reset);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BoardsAPI.list();
      setBoards(data);
    } catch (err) {
      console.error('Error obteniendo tableros', err);
      setBoards([]);
      setError('No se pudieron cargar los tableros. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (activeBoardId && !boards.some(b => b._id === activeBoardId)) {
      setActiveBoardId(null);
    }
  }, [activeBoardId, boards]);

  const activeBoard = useMemo(
    () => (activeBoardId ? boards.find(b => b._id === activeBoardId) ?? null : null),
    [activeBoardId, boards],
  );

  const sortedBoards = useMemo(() => {
    return [...boards].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [boards]);

  const handleOpenBoard = (boardId: string) => {
    setActiveBoardId(boardId);
  };

  const handleBackToBoards = () => {
    resetBoard();
    setActiveBoardId(null);
  };

  const handleChange = (field: keyof BoardForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateBoard = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = { name: form.name.trim(), owner: form.owner.trim() };
    if (!trimmed.name || !trimmed.owner) {
      setFormError('Completa el nombre y el propietario.');
      return;
    }

    setFormError(null);
    setCreating(true);
    try {
      const created = await BoardsAPI.create(trimmed);
      setBoards(prev => [created, ...prev.filter(b => b._id !== created._id)]);
      setForm({ name: '', owner: '' });
      setActiveBoardId(created._id);
    } catch (err) {
      console.error('Error creando tablero', err);
      setFormError('No se pudo crear el tablero. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  if (activeBoard) {
    return <BoardPage board={activeBoard} onBack={handleBackToBoards} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Tableros Kanban</p>
          <h1 className="text-3xl font-semibold text-slate-900">Organiza tu trabajo</h1>
          <p className="text-base text-slate-600">
            Elige un tablero existente o crea uno nuevo para empezar a colaborar con tu equipo.
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:items-start">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-800">Tus tableros</h2>
              <button
                type="button"
                onClick={loadBoards}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-800"
              >
                ↻ Actualizar
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Cargando tableros...
              </div>
            ) : sortedBoards.length ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {sortedBoards.map(board => (
                  <li key={board._id}>
                    <button
                      type="button"
                      onClick={() => handleOpenBoard(board._id)}
                      className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                    >
                      <span className="text-base font-semibold text-slate-900">{board.name}</span>
                      <span className="mt-1 text-sm text-slate-500">Propietario: {board.owner}</span>
                      {board.createdAt && (
                        <span className="mt-3 text-xs text-slate-400">
                          Creado el {new Date(board.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-sm text-slate-500">
                Todavía no tienes tableros. Completa el formulario para crear el primero.
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Crear un tablero</h2>
            <p className="mt-1 text-sm text-slate-500">
              Los tableros necesitan un nombre y un propietario para identificarlos.
            </p>
            <form onSubmit={handleCreateBoard} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label htmlFor="board-name" className="text-sm font-medium text-slate-700">
                  Nombre del tablero
                </label>
                <input
                  id="board-name"
                  type="text"
                  value={form.name}
                  onChange={handleChange('name')}
                  placeholder="Ej. Roadmap 2025"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="board-owner" className="text-sm font-medium text-slate-700">
                  Propietario
                </label>
                <input
                  id="board-owner"
                  type="text"
                  value={form.owner}
                  onChange={handleChange('owner')}
                  placeholder="Tu nombre o equipo"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-200"
              >
                {creating ? 'Creando...' : 'Crear tablero'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}
