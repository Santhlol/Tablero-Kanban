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

  const board = useMemo(() => selectedBoard, [selectedBoard]);

  if (board) {
    return <BoardPage board={board} onBack={handleBackToBoards} />;
  }

  return <BoardLanding onSelectBoard={handleOpenBoard} />;
}
