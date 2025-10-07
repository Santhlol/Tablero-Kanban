import { useMemo, useState } from 'react';
import { BoardLanding } from './pages/BoardLanding';
import { BoardPage } from './components/BoardPage';
import type { BoardSummary } from './types/board';
import { useBoard } from './store/board';

export default function App() {
  const [selectedBoard, setSelectedBoard] = useState<BoardSummary | null>(null);
  const resetBoard = useBoard(state => state.reset);

  const handleOpenBoard = (board: BoardSummary) => {
    setSelectedBoard(board);
  };

  const handleBackToBoards = () => {
    resetBoard();
    setSelectedBoard(null);
  };

  const handleBoardUpdate = (updated: BoardSummary) => {
    setSelectedBoard(prev => (prev && prev._id === updated._id ? { ...prev, ...updated } : prev));
  };

  const handleBoardDeleted = (boardId: string) => {
    let shouldReset = false;
    setSelectedBoard(prev => {
      if (prev && prev._id === boardId) {
        shouldReset = true;
        return null;
      }
      return prev;
    });
    if (shouldReset) {
      resetBoard();
    }
  };

  const board = useMemo(() => selectedBoard, [selectedBoard]);

  if (board) {
    return (
      <BoardPage
        board={board}
        onBack={handleBackToBoards}
        onBoardUpdate={handleBoardUpdate}
        onBoardDeleted={handleBoardDeleted}
      />
    );
  }

  return <BoardLanding onSelectBoard={handleOpenBoard} />;
}
