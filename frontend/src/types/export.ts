export type ExportField = 'id' | 'title' | 'description' | 'column' | 'createdAt';

export type ExportStatusValue = 'pending' | 'success' | 'error';

export type ExportRecord = {
  requestId: string;
  boardId: string;
  to: string;
  fields: ExportField[];
  status: ExportStatusValue;
  requestedAt: string;
  completedAt?: string | null;
  error?: string | null;
};
