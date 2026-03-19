import { AuditRepository } from '../repositories/audit.repository';
import { AuditLog, AuditLogFilter, PaginatedResult } from '../types/archive.types';

export class AuditService {
  constructor(private readonly auditRepo: AuditRepository) {}

  async listAuditLogs(
    _adminId: string,
    _filter: AuditLogFilter
  ): Promise<PaginatedResult<AuditLog>> {
    throw new Error('AuditService.listAuditLogs not implemented');
  }

  async getAuditLog(_adminId: string, _logId: string): Promise<AuditLog> {
    throw new Error('AuditService.getAuditLog not implemented');
  }
}
