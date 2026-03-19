import { PermissionCheckInput } from '../interfaces/permission-check.interface';
import { PermissionResult } from '../interfaces/permission-result.interface';
import { TaskAccessRecord } from '../interfaces/task-access-record.interface';

export interface IPermissionService {
  checkPermission(input: PermissionCheckInput): Promise<PermissionResult>;
  getAllowedActions(userId: string, taskId: string): Promise<Record<string, boolean>>;
  grantOwnerAccess(taskId: string, ownerId: string): Promise<void>;
  grantAssigneeAccess(taskId: string, userId: string, grantedById: string): Promise<void>;
  revokeAssigneeAccess(taskId: string, userId: string, revokedById: string): Promise<void>;
  grantTeamLeadAccess(taskId: string, teamLeadId: string): Promise<void>;
  revokeTeamLeadAccess(taskId: string, teamLeadId: string): Promise<void>;
  getTaskAccessors(taskId: string): Promise<TaskAccessRecord[]>;
}
