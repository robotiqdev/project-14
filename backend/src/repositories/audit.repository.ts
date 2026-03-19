import { CreateAuditEntry, IAuditLog } from '../types/audit.types';

export interface IAuditRepository {
  create(entry: CreateAuditEntry): Promise<IAuditLog>;
}

export class AuditRepository implements IAuditRepository {
  async create(_entry: CreateAuditEntry): Promise<IAuditLog> {
    throw new Error('Not implemented');
  }
}
