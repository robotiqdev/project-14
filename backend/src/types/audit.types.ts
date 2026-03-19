export interface IAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown>;
}
