import express, { Express } from 'express';
import { ITaskRepository } from './repositories/TaskRepository';
import { IUserRepository } from './repositories/UserRepository';
import { INotificationService } from './services/NotificationService';
import { IOverdueDetectionService } from './services/OverdueDetectionService';

export interface AppDependencies {
  taskRepository?: ITaskRepository;
  userRepository?: IUserRepository;
  notificationService?: INotificationService;
  overdueDetectionService?: IOverdueDetectionService;
}

export function createApp(deps?: AppDependencies): Express {
  const app = express();
  app.use(express.json());
  return app;
}

export default createApp();
