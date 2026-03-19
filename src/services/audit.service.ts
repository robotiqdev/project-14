import { AuditRepository } from '../repositories/audit.repository';
import { AuditLog, AuditLogFilter, PaginatedResult } from '../types/archive.types';

export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  async listAuditLogs(
    _adminId: string,
    filter: AuditLogFilter
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditRepo.findAll(filter);
  }

  async getAuditLog(_adminId: string, logId: string): Promise<AuditLog> {
    const log = await this.auditRepo.findById(logId);
    if (!log) {
      const error = Object.assign(new Error('Audit log not found'), { status: 404 });
      throw error;
    }
    return log;
  }
}
