import { Pool } from 'pg';
import {
  ArchiveFilter,
  ArchivedTask,
  PaginatedResult,
  Task,
} from '../types/archive.types';

export class ArchiveRepository {
  constructor(private readonly pool: Pool) {}

  async findAllArchived(
    _filter: ArchiveFilter
  ): Promise<PaginatedResult<ArchivedTask>> {
    throw new Error('ArchiveRepository.findAllArchived not implemented');
  }

  async findArchivedById(_id: string): Promise<ArchivedTask | null> {
    throw new Error('ArchiveRepository.findArchivedById not implemented');
  }

  async restoreTask(_id: string, _restoredBy: string): Promise<Task> {
    throw new Error('ArchiveRepository.restoreTask not implemented');
  }
}
