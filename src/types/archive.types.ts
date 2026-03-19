export interface ArchiveFilter {
  team_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ArchivedTask {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  status: string;
  archived_at: string;
  archived_by: string;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  team_id: string;
  status: string;
  archived_at: string | null;
  archived_by: string | null;
  archive_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilter {
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface AppError extends Error {
  status: number;
}
