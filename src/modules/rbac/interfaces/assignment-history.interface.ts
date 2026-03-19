export interface CreateAssignmentHistoryInput {
  taskId: string;
  assigneeId: string;
  assignedById: string;
  assignedAt: Date;
  reason?: string;
}

export interface CloseAssignmentHistoryInput {
  taskId: string;
  assigneeId: string;
  unassignedById: string;
  unassignedAt: Date;
  reason?: string;
}
