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
    _filter: ArchiveFilter
  ): Promise<PaginatedResult<ArchivedTask>> {
    throw new Error('ArchiveService.listArchivedTasks not implemented');
  }

  async getArchivedTask(
    _adminId: string,
    _taskId: string
  ): Promise<ArchivedTask> {
    throw new Error('ArchiveService.getArchivedTask not implemented');
  }

  async restoreTask(_adminId: string, _taskId: string): Promise<Task> {
    throw new Error('ArchiveService.restoreTask not implemented');
  }
}
