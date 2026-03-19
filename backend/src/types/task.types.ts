export enum TaskStatus {
  Draft = 'Draft',
  Todo = 'Todo',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Archived = 'Archived',
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export interface ITask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  teamId: string;
  assigneeId: string | null;
  createdById: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
