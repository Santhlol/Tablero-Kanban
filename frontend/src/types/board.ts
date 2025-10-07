export type BoardSummary = {
  _id: string;
  name: string;
  owner: string;
  createdAt?: string;
};

export type BoardAutomationSummary = {
  boardId: string;
  totalTasks: number;
  columns: Array<{
    id: string;
    title: string;
    count: number;
  }>;
};
