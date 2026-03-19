import { ArchiveRepository } from '../repositories/archive.repository';
import { AuditRepository } from '../repositories/audit.repository';
import {
  ArchiveFilter,
  ArchivedTask,
  PaginatedResult,
  Task,
} from '../types/archive.types';

export class ArchiveService {
  constructor(
    private readonly archiveRepo: ArchiveRepository,
    private readonly auditRepo: AuditRepository
  ) {}

  async listArchivedTasks(
    _adminId: string,
    filter: ArchiveFilter
  ): Promise<PaginatedResult<ArchivedTask>> {
    return this.archiveRepo.findAllArchived(filter);
  }

  async getArchivedTask(
    _adminId: string,
    taskId: string
  ): Promise<ArchivedTask> {
    const task = await this.archiveRepo.findArchivedById(taskId);
    if (!task) {
      const error = Object.assign(new Error('Task not found'), { status: 404 });
      throw error;
    }
    return task;
  }

  async restoreTask(adminId: string, taskId: string): Promise<Task> {
    const existingTask = await this.archiveRepo.findArchivedById(taskId);
    if (!existingTask) {
      const error = Object.assign(new Error('Task not found'), { status: 404 });
      throw error;
    }

    const restoredTask = await this.archiveRepo.restoreTask(taskId, adminId);

    await this.auditRepo.createLog({
      entity_type: 'task',
      entity_id: taskId,
      action: 'RESTORED',
      actor_id: adminId,
      before_state: { archived_at: existingTask.archived_at },
      after_state: { archived_at: null },
    });

    return restoredTask;
  }
}
