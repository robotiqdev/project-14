import { AuditAction } from '../types';

export interface IAuditService {
  log(params: {
    action: AuditAction;
    actorId: string;
    resourceType: string;
    resourceId: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void>;
}

export class AuditService implements IAuditService {
  async log(_params: {
    action: AuditAction;
    actorId: string;
    resourceType: string;
    resourceId: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    // implementation
  }
}
