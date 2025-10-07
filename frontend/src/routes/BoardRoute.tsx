import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BoardsAPI } from '../api/http';
import { BoardPage } from '../components/BoardPage';
import { useBoard } from '../store/board';
import type { BoardSummary } from '../types/board';

type LocationState = {
  board?: BoardSummary;
};

export function BoardRoute() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const resetBoard = useBoard(state => state.reset);
  const locationState = location.state as LocationState | null;
  const initialBoard =
    boardId && locationState?.board && locationState.board._id === boardId ? locationState.board : null;

  const [board, setBoard] = useState<BoardSummary | null>(initialBoard);
  const [loading, setLoading] = useState(!initialBoard);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    resetBoard();
    return () => {
      resetBoard();
    };
  }, [boardId, resetBoard]);

  useEffect(() => {
    if (!boardId) return;

    const state = (location.state as LocationState | null) ?? null;
    if (state?.board && state.board._id === boardId) {
      setBoard(state.board);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    BoardsAPI.get(boardId)
      .then(data => {
        if (cancelled) return;
        setBoard(data);
        setError(null);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('Error obteniendo tablero', err);
        setBoard(null);
        setError('No se pudo cargar el tablero. Puede que no exista o haya sido eliminado.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [boardId, location.state, retryCount]);

  const handleBack = useCallback(() => {
    resetBoard();
    navigate('/', { replace: false });
  }, [navigate, resetBoard]);

  const handleBoardUpdate = useCallback((updated: BoardSummary) => {
    setBoard(prev => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
  }, []);

  const handleBoardDeleted = useCallback(
    (removedId: string) => {
      if (board && board._id === removedId) {
        setBoard(null);
      }
      resetBoard();
      navigate('/', { replace: true });
    },
    [board, navigate, resetBoard],
  );

  const retry = useCallback(() => {
    if (!boardId) return;
    setRetryCount(count => count + 1);
  }, [boardId]);

  if (!boardId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-slate-700">Cargando tablero...</p>
          <p className="text-sm text-slate-500">Preparando tus columnas y tareas.</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-red-600">{error ?? 'No encontramos este tablero.'}</p>
          <p className="text-sm text-slate-500">Puedes volver al listado o reintentar cargarlo.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-800"
            >
              ← Volver a tableros
            </button>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border border-indigo-200 bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BoardPage
      board={board}
      onBack={handleBack}
      onBoardUpdate={handleBoardUpdate}
      onBoardDeleted={handleBoardDeleted}
    />
  );
}
