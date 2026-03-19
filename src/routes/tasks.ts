import { Router } from 'express';
import { ITaskRepository } from '../repositories/TaskRepository';
import { IUserRepository } from '../repositories/UserRepository';
import { INotificationService } from '../services/NotificationService';

export interface TaskRouteDeps {
  taskRepository: ITaskRepository;
  userRepository: IUserRepository;
  notificationService: INotificationService;
}

export function createTasksRouter(deps: TaskRouteDeps): Router {
  const router = Router();
  return router;
}

export default createTasksRouter;
