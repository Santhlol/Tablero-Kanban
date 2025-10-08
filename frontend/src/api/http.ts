import axios from 'axios';
import type { BoardSummary } from '../types/board';
import type { Column, Task } from '../store/board';
import type { ExportField, ExportRecord } from '../types/export';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helpers de API
export const BoardsAPI = {
  list: () => http.get<BoardSummary[]>('/boards').then(r => r.data),
  get: (id: string) => http.get<BoardSummary>(`/boards/${id}`).then(r => r.data),
  create: (payload: { name: string; owner: string }) =>
    http.post<BoardSummary>('/boards', payload).then(r => r.data),
  update: (id: string, payload: Partial<Pick<BoardSummary, 'name' | 'owner'>>) =>
    http.patch<BoardSummary>(`/boards/${id}`, payload).then(r => r.data),
  remove: (id: string) => http.delete<{ id: string }>(`/boards/${id}`).then(r => r.data),
  summary: (id: string) => http.get(`/boards/${id}/summary`).then(r => r.data),
};

export const ColumnsAPI = {
  byBoard: (boardId: string) => http.get<Column[]>(`/columns/board/${boardId}`).then(r => r.data),
  create: (payload: Pick<Column, 'boardId' | 'title' | 'position'>) =>
    http.post<Column>('/columns', payload).then(r => r.data),
  update: (id: string, payload: Partial<Pick<Column, 'title' | 'position'>>) =>
    http.patch<Column>(`/columns/${id}`, payload).then(r => r.data),
  remove: (id: string) => http.delete(`/columns/${id}`).then(r => r.data),
};

export const TasksAPI = {
  byBoard: (boardId: string) => http.get<Task[]>(`/tasks/board/${boardId}`).then(r => r.data),
  create: (payload: Omit<Task, '_id'>) => http.post<Task>('/tasks', payload).then(r => r.data),
  update: (
    id: string,
    payload: Partial<Pick<Task, 'title' | 'description' | 'assignee'>>,
  ) => http.patch<Task>(`/tasks/${id}`, payload).then(r => r.data),
  move: (id: string, payload: { columnId: string; position: number }) =>
    http.patch<Task>(`/tasks/${id}/move`, payload).then(r => r.data),
  remove: (id: string) => http.delete(`/tasks/${id}`).then(r => r.data),
};

export const ExportAPI = {
  requestBacklog: (payload: { boardId: string; to: string; fields?: ExportField[] }) =>
    http.post<ExportRecord>('/export/backlog', payload).then(r => r.data),
  status: (requestId: string) =>
    http.get<ExportRecord>(`/export/backlog/${requestId}`).then(r => r.data),
};
