import { INotificationRepository } from '../repositories/notification.repository';
import { NotificationPayload, NotificationRecord, NotificationRecipient } from '../types';

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
    // Parse @mentions from body
    const mentionRegex = /(?<=\s|^)@([\w.]+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(_body)) !== null) {
      mentions.push(match[1]);
    }

    // In a real implementation, would query task leads and resolve mentions to user IDs.
    // Here we return an empty deduplicated array since no DB is connected.
    const recipients: NotificationRecipient[] = [];

    const seen = new Set<string>();
    return recipients.filter((r) => {
      if (seen.has(r.userId)) return false;
      seen.add(r.userId);
      return true;
    });
  }

  async dispatch(payload: NotificationPayload): Promise<void> {
    const records = await this.notificationRepo.createBatch(payload);

    const deliveryPromises = records.map((record: NotificationRecord) =>
      this.deliverRecord(record, payload)
    );

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverRecord(
    record: NotificationRecord,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      if (record.channel === 'EMAIL') {
        await this.emailAdapter.send({
          to: record.userId,
          subject: 'New notification',
          body: payload.body,
        });
      }
      await this.notificationRepo.markDelivered(record.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.notificationRepo.markFailed(record.id, message);
    }
  }
}
