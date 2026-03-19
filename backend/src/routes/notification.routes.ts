import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

export function createNotificationRouter(controller: NotificationController): Router {
  const router = Router();

  router.get('/notifications', controller.getPending);
  router.post('/notifications/:id/delivered', controller.markDelivered);

  return router;
}
