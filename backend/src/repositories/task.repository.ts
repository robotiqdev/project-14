import { ITask, TaskStatus } from '../types/task.types';

export interface ITaskRepository {
  findById(id: string): Promise<ITask | null>;
  updateStatus(id: string, status: TaskStatus, archivedAt?: Date): Promise<ITask>;
}

export class TaskRepository implements ITaskRepository {
  async findById(_id: string): Promise<ITask | null> {
    throw new Error('Not implemented');
  }

  async updateStatus(_id: string, _status: TaskStatus, _archivedAt?: Date): Promise<ITask> {
    throw new Error('Not implemented');
  }
}
