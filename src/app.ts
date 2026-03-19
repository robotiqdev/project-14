import express, { Express } from 'express';
import { ITaskRepository } from './repositories/TaskRepository';
import { IUserRepository } from './repositories/UserRepository';
import { INotificationService } from './services/NotificationService';
import { IOverdueDetectionService } from './services/OverdueDetectionService';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { createTasksRouter } from './routes/tasks';
import { createOverdueRouter } from './routes/internal/overdue';

export interface AppDependencies {
  taskRepository?: ITaskRepository;
  userRepository?: IUserRepository;
  notificationService?: INotificationService;
  overdueDetectionService?: IOverdueDetectionService;
}

export function createApp(deps?: AppDependencies): Express {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);

  if (deps?.taskRepository && deps?.userRepository && deps?.notificationService) {
    app.use('/tasks', createTasksRouter({
      taskRepository: deps.taskRepository,
      userRepository: deps.userRepository,
      notificationService: deps.notificationService,
    }));
  }

  if (deps?.taskRepository && deps?.overdueDetectionService) {
    app.use('/internal/overdue/detect', createOverdueRouter({
      taskRepository: deps.taskRepository,
      overdueDetectionService: deps.overdueDetectionService,
    }));
  }

  app.use(errorHandler);
  return app;
}

export default createApp;
