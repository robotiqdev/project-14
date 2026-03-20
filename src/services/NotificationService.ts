import { TaskWithAssignee } from '../repositories/TaskRepository';
import { User } from '../repositories/UserRepository';

export interface EnqueueResult {
  enqueued: boolean;
  skipped?: boolean;
}

export interface INotificationService {
  enqueueIfNotAlreadySent(task: TaskWithAssignee): Promise<EnqueueResult>;
  enqueueAssignmentNotification(task: TaskWithAssignee, user: User): Promise<void>;
}

export class NotificationService implements INotificationService {
  async enqueueIfNotAlreadySent(task: TaskWithAssignee): Promise<EnqueueResult> {
    throw new Error('Not implemented');
  }

  async enqueueAssignmentNotification(task: TaskWithAssignee, user: User): Promise<void> {
    throw new Error('Not implemented');
  }
}
