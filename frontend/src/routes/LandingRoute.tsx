import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BoardSummary } from '../types/board';
import { BoardLanding } from '../pages/BoardLanding';

type NavigationState = {
  board: BoardSummary;
};

export function LandingRoute() {
  const navigate = useNavigate();

  const handleSelectBoard = useCallback(
    (board: BoardSummary) => {
      navigate(`/boards/${board._id}`, { state: { board } satisfies NavigationState });
    },
    [navigate],
  );

  return <BoardLanding onSelectBoard={handleSelectBoard} />;
}
