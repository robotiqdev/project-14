import { Router } from 'express';
import { ITaskRepository } from '../repositories/TaskRepository';
import { IUserRepository } from '../repositories/UserRepository';
import { INotificationService } from '../services/NotificationService';
import { IOverdueDetectionService } from '../services/OverdueDetectionService';

export interface RouterDeps {
  taskRepository?: ITaskRepository;
  userRepository?: IUserRepository;
  notificationService?: INotificationService;
  overdueDetectionService?: IOverdueDetectionService;
}

export function createRouter(deps: RouterDeps): Router {
  const router = Router();
  return router;
}

export default createRouter;
