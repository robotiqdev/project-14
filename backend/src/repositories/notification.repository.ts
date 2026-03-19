import { NotificationPayload, NotificationRecord } from '../types';

export interface INotificationRepository {
  createBatch(payload: NotificationPayload): Promise<NotificationRecord[]>;
  markDelivered(id: string): Promise<void>;
  markFailed(id: string, error?: string): Promise<void>;
  findPending(userId: string): Promise<NotificationRecord[]>;
}
