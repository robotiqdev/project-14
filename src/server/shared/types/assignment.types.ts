export interface IAssignment {
  id: string;
  taskId: string;
  assigneeId: string;
  assignedById: string;
  assignedAt: Date;
  unassignedAt: Date | null;
  unassignReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAssignTaskDTO {
  taskId: string;
  assigneeId: string;
}

export interface IReassignTaskDTO {
  taskId: string;
  newAssigneeId: string;
  reason?: string;
}

export interface IUnassignTaskDTO {
  taskId: string;
  reason?: string;
}

export interface IAssignmentHistory {
  taskId: string;
  assignments: IAssignment[];
}

export interface IAuditService {
  log(event: string, payload: Record<string, unknown>): Promise<void>;
}

export interface INotificationService {
  notifyAssigned(assigneeId: string, taskId: string, assignedById: string): Promise<void>;
  notifyReassigned(
    oldAssigneeId: string,
    newAssigneeId: string,
    taskId: string,
    actorId: string,
  ): Promise<void>;
  notifyUnassigned(assigneeId: string, taskId: string, actorId: string): Promise<void>;
}

export class AssignmentNotFoundError extends Error {
  constructor(message = 'No active assignment found') {
    super(message);
    this.name = 'AssignmentNotFoundError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(message = 'Task not found') {
    super(message);
    this.name = 'TaskNotFoundError';
  }
}

export class AssigneeNotActiveTeamMemberError extends Error {
  constructor(message = 'Assignee is not an active team member') {
    super(message);
    this.name = 'AssigneeNotActiveTeamMemberError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}
