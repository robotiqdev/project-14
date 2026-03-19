import { Action } from '../../../common/enums/action.enum';
import { TaskAccess } from '../../task-access/entities/task-access.entity';
import { TaskAccessReason } from '../enums/task-access-reason.enum';

export interface ITaskAccessService {
  findActiveRecord(taskId: string, userId: string): Promise<TaskAccess | null>;
  upsertAccess(
    taskId: string,
    userId: string,
    reason: TaskAccessReason,
    actions: Action[],
    expiresAt: Date | null,
    grantedById?: string,
  ): Promise<TaskAccess>;
  downgradeToReadOnly(taskId: string, userId: string, expiresAt: Date): Promise<TaskAccess>;
  deactivate(taskId: string, userId: string): Promise<void>;
  findAllForTask(taskId: string): Promise<TaskAccess[]>;
}
