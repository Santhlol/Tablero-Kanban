import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Helpers de API
export const BoardsAPI = {
  list: () => http.get('/boards').then(r => r.data),
  get: (id: string) => http.get(`/boards/${id}`).then(r => r.data),
  summary: (id: string) => http.get(`/boards/${id}/summary`).then(r => r.data),
};

export const ColumnsAPI = {
  byBoard: (boardId: string) => http.get(`/columns/board/${boardId}`).then(r => r.data),
  create: (payload: any) => http.post('/columns', payload).then(r => r.data),
};

export const TasksAPI = {
  byBoard: (boardId: string) => http.get(`/tasks/board/${boardId}`).then(r => r.data),
  create: (payload: any) => http.post('/tasks', payload).then(r => r.data),
  move: (id: string, payload: { columnId: string; position: number }) =>
    http.patch(`/tasks/${id}/move`, payload).then(r => r.data),
};
