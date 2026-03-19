import { Action } from '../../../common/enums/action.enum';
import { TaskAccessReason } from '../enums/task-access-reason.enum';

export interface TaskAccessRecord {
  userId: string;
  taskId: string;
  accessReason: TaskAccessReason;
  grantedActions: Action[];
  expiresAt: Date | null;
  isActive: boolean;
}
