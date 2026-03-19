export interface TaskWithAssignee {
  id: string;
  title: string;
  due_date: Date | null;
  status: string;
  assignee_id: string | null;
  user_id: string | null;
  email: string | null;
  name: string | null;
  timezone: string | null;
}

export interface ITaskRepository {
  findOverdueTasks(): Promise<TaskWithAssignee[]>;
  findOverdueForUser(userId: string): Promise<TaskWithAssignee[]>;
  findById(id: string): Promise<TaskWithAssignee | null>;
  create(data: Partial<TaskWithAssignee>): Promise<TaskWithAssignee>;
  updateAssignee(id: string, assigneeId: string): Promise<TaskWithAssignee>;
}

export class TaskRepository implements ITaskRepository {
  async findOverdueTasks(): Promise<TaskWithAssignee[]> {
    throw new Error('Not implemented');
  }

  async findOverdueForUser(userId: string): Promise<TaskWithAssignee[]> {
    throw new Error('Not implemented');
  }

  async findById(id: string): Promise<TaskWithAssignee | null> {
    throw new Error('Not implemented');
  }

  async create(data: Partial<TaskWithAssignee>): Promise<TaskWithAssignee> {
    throw new Error('Not implemented');
  }

  async updateAssignee(id: string, assigneeId: string): Promise<TaskWithAssignee> {
    throw new Error('Not implemented');
  }
}
