import { INotificationRepository } from '../repositories/notification.repository';
import { NotificationPayload, NotificationRecipient } from '../types';

export interface IEmailAdapter {
  send(params: { to: string; subject: string; body: string }): Promise<void>;
}

export interface INotificationService {
  dispatch(payload: NotificationPayload): Promise<void>;
  resolveRecipients(taskId: string, body: string): Promise<NotificationRecipient[]>;
}

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly emailAdapter: IEmailAdapter
  ) {}

  async resolveRecipients(_taskId: string, _body: string): Promise<NotificationRecipient[]> {
    throw new Error('Not implemented');
  }

  async dispatch(_payload: NotificationPayload): Promise<void> {
    throw new Error('Not implemented');
  }
}
