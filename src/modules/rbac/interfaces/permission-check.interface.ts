import { Action } from '../../../common/enums/action.enum';

export interface PermissionCheckInput {
  userId: string;
  taskId: string;
  action: Action;
}
