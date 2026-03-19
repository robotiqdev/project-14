import { Action } from '../../../common/enums/action.enum';
import { TaskAccessReason } from '../enums/task-access-reason.enum';

export const ACCESS_REASON_ACTION_MATRIX: Record<TaskAccessReason, Action[]> = {
  [TaskAccessReason.OWNER]: Object.values(Action),
  [TaskAccessReason.CURRENT_ASSIGNEE]: [
    Action.READ,
    Action.WRITE,
    Action.COMMENT,
    Action.CHANGE_STATUS,
  ],
  [TaskAccessReason.TEAM_LEAD]: [
    Action.READ,
    Action.WRITE,
    Action.COMMENT,
    Action.ASSIGN,
  ],
};
