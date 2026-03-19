import { Pool } from 'pg';
import { AuditLog, AuditLogFilter, PaginatedResult } from '../types/archive.types';

export class AuditRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    _filter: AuditLogFilter
  ): Promise<PaginatedResult<AuditLog>> {
    throw new Error('AuditRepository.findAll not implemented');
  }

  async findById(_id: string): Promise<AuditLog | null> {
    throw new Error('AuditRepository.findById not implemented');
  }

  async createLog(
    _entry: Omit<AuditLog, 'id' | 'created_at'>
  ): Promise<AuditLog> {
    throw new Error('AuditRepository.createLog not implemented');
  }
}
