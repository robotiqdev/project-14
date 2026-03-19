import { Request, Response, NextFunction } from 'express';
import { INotificationRepository } from '../repositories/notification.repository';

export class NotificationController {
  constructor(private readonly notificationRepo: INotificationRepository) {}

  getPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const notifications = await this.notificationRepo.findPending(userId);
      res.json(notifications);
    } catch (err) {
      next(err);
    }
  };

  markDelivered = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      await this.notificationRepo.markDelivered(id);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  };
}
