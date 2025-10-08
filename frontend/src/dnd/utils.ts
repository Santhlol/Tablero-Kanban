// src/dnd/utils.ts
export type DndId = `task:${string}` | `column:${string}`;

export const taskId = (id: string): DndId => `task:${id}`;
export const columnId = (id: string): DndId => `column:${id}`;

export const isTaskId = (id: string): id is `task:${string}` => id.startsWith('task:');
export const isColumnId = (id: string): id is `column:${string}` => id.startsWith('column:');

export const rawId = (id: DndId) => id.split(':')[1];

export function computeNewPosition(
  destListLength: number,
  _destIndex: number,
  before?: number,
  after?: number
): number {
  if (before !== undefined && after !== undefined) {
    const mid = (before + after) / 2;
    if (Number.isInteger(mid)) return mid;
    return Math.floor(mid); 
  }
  if (after !== undefined) return Math.max(0, after - 10);
  if (before !== undefined) return before + 10;

  // Lista vacía
  if (destListLength === 0) return 0;
  // Final de lista
  return destListLength * 10;
}
