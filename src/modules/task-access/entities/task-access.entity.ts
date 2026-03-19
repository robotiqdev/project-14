import { Action } from '../../../common/enums/action.enum';
import { TaskAccessReason } from '../../rbac/enums/task-access-reason.enum';

export class TaskAccess {
  id: string;
  taskId: string;
  userId: string;
  accessReason: TaskAccessReason;
  grantedActions: Action[];
  expiresAt: Date | null;
  isActive: boolean;
  grantedById: string | null;
}
