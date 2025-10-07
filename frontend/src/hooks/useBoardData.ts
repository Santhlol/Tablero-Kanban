import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnsAPI, TasksAPI } from '../api/http';
import { useBoard } from '../store/board';

export const boardQueryKeys = {
  columns: (boardId: string) => ['board', boardId, 'columns'] as const,
  tasks: (boardId: string) => ['board', boardId, 'tasks'] as const,
};

export function useBoardData(boardId: string) {
  const { setColumns, setTasks } = useBoard();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: boardQueryKeys.columns(boardId) });
      queryClient.removeQueries({ queryKey: boardQueryKeys.tasks(boardId) });
    };
  }, [boardId, queryClient]);

  const columnsQuery = useQuery({
    queryKey: boardQueryKeys.columns(boardId),
    queryFn: () => ColumnsAPI.byBoard(boardId),
    enabled: Boolean(boardId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (columnsQuery.data) {
      setColumns(columnsQuery.data);
    }
  }, [columnsQuery.data, setColumns]);

  const tasksQuery = useQuery({
    queryKey: boardQueryKeys.tasks(boardId),
    queryFn: () => TasksAPI.byBoard(boardId),
    enabled: Boolean(boardId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (tasksQuery.data) {
      setTasks(tasksQuery.data);
    }
  }, [tasksQuery.data, setTasks]);

  return { columnsQuery, tasksQuery };
}
