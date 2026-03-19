import { ITask, TaskStatus } from '../types/task.types';
import { ITaskRepository } from '../repositories/task.repository';
import { IAuditRepository } from '../repositories/audit.repository';
import { AlreadyArchivedError, ForbiddenStatusError, NotFoundError } from '../errors/app-errors';

export interface ITaskArchiveService {
  archiveTask(taskId: string, actorId: string): Promise<ITask>;
}

export class TaskArchiveService implements ITaskArchiveService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly auditRepository: IAuditRepository,
  ) {}

  async archiveTask(taskId: string, actorId: string): Promise<ITask> {
    const task = await this.taskRepository.findById(taskId);

    if (!task) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.Archived) {
      throw new AlreadyArchivedError(`Task ${taskId} is already archived`);
    }

    if (task.status !== TaskStatus.InProgress && task.status !== TaskStatus.Completed) {
      throw new ForbiddenStatusError(`Task in ${task.status} status cannot be archived`);
    }

    const archivedAt = new Date();
    const updatedTask = await this.taskRepository.updateStatus(taskId, TaskStatus.Archived, archivedAt);

    await this.auditRepository.create({
      entityType: 'Task',
      entityId: taskId,
      action: 'TASK_ARCHIVED',
      actorId,
      metadata: {},
    });

    return updatedTask;
  }
}
