import { ITask } from '../types/task.types';
import { ITaskRepository } from '../repositories/task.repository';
import { IAuditRepository } from '../repositories/audit.repository';

export interface ITaskArchiveService {
  archiveTask(taskId: string, actorId: string): Promise<ITask>;
}

export class TaskArchiveService implements ITaskArchiveService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly auditRepository: IAuditRepository,
  ) {}

  async archiveTask(_taskId: string, _actorId: string): Promise<ITask> {
    throw new Error('Not implemented');
  }
}
