import { create } from 'zustand';

export type Column = { _id: string; boardId: string; title: string; position: number };
export type Task   = { _id: string; boardId: string; columnId: string; title: string; position: number; description?: string; assignee?: string };

type State = {
  boardId?: string;
  columns: Column[];
  tasksByColumn: Record<string, Task[]>;
  setBoardId: (id: string) => void;
  setColumns: (cols: Column[]) => void;
  upsertColumn: (col: Column) => void;
  updateColumn: (id: string, data: Partial<Column>) => void;
  removeColumn: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  upsertTask: (t: Task) => void;
  removeTask: (id: string, columnId: string) => void;
  moveTaskLocally: (taskId: string, fromColumnId: string, toColumnId: string, toPosition: number) => void;
  reset: () => void;
};

export const useBoard = create<State>((set) => ({
  boardId: undefined,
  columns: [],
  tasksByColumn: {},
  setBoardId: (id) => set({ boardId: id }),
  setColumns: (cols) => set({ columns: [...cols].sort((a,b)=>a.position-b.position) }),
  upsertColumn: (col) => set(state => {
    const next = [...state.columns.filter(c => c._id !== col._id), col];
    next.sort((a,b)=>a.position-b.position);
    return { columns: next };
  }),
  updateColumn: (id, data) => set(state => {
    const next = state.columns.map(col => (col._id === id ? { ...col, ...data } : col));
    next.sort((a,b)=>a.position-b.position);
    return { columns: next };
  }),
  removeColumn: (id) => set(state => {
    const nextTasks = { ...state.tasksByColumn };
    delete nextTasks[id];
    return {
      columns: state.columns.filter(col => col._id !== id),
      tasksByColumn: nextTasks,
    };
  }),
  setTasks: (tasks) => set({
    tasksByColumn: tasks.reduce((acc, t) => {
      const list = acc[t.columnId] || [];
      list.push(t);
      list.sort((a,b)=>a.position-b.position);
      acc[t.columnId] = list;
      return acc;
    }, {} as Record<string, Task[]>)
  }),
  upsertTask: (t) => set(state => {
    const list = state.tasksByColumn[t.columnId] || [];
    const without = list.filter(x => x._id !== t._id);
    const next = [...without, t].sort((a,b)=>a.position-b.position);
    return { tasksByColumn: { ...state.tasksByColumn, [t.columnId]: next } };
  }),
  removeTask: (id, columnId) => set(state => {
    const list = (state.tasksByColumn[columnId] || []).filter(x => x._id !== id);
    return { tasksByColumn: { ...state.tasksByColumn, [columnId]: list } };
  }),
  moveTaskLocally: (taskId, fromColumnId, toColumnId, toPosition) =>
    set(state => {
      const from = [...(state.tasksByColumn[fromColumnId] || [])].filter(t => t._id !== taskId);
      const moving = (state.tasksByColumn[fromColumnId] || []).find(t => t._id === taskId);
      const to = [...(state.tasksByColumn[toColumnId] || [])];

      if (!moving) return state;

      const moved: Task = { ...moving, columnId: toColumnId, position: toPosition };

      // insertar y ordenar
      to.push(moved);
      to.sort((a,b)=>a.position-b.position);

      return {
        tasksByColumn: {
          ...state.tasksByColumn,
          [fromColumnId]: from,
          [toColumnId]: to,
        }
      };
    }),
  reset: () => set({ boardId: undefined, columns: [], tasksByColumn: {} }),
}));
