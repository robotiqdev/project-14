import { TaskAccessReason } from '../enums/task-access-reason.enum';

export interface PermissionResult {
  allowed: boolean;
  reason: TaskAccessReason | null;
  deniedBecause?: string;
}
