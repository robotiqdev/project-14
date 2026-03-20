import { Router, Request, Response, NextFunction } from 'express';
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
  const { taskRepository, userRepository, notificationService } = deps;

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, due_date, assignee_id } = req.body;

      if (!title) {
        res.status(400).json({ errors: [{ field: 'title', message: 'title is required' }] });
        return;
      }

      const data: any = { title };
      if (due_date !== undefined) data.due_date = new Date(due_date);
      if (assignee_id !== undefined) data.assignee_id = assignee_id;

      const task = await taskRepository.create(data);

      if (assignee_id) {
        const user = await userRepository.findById(assignee_id);
        if (user) {
          await notificationService.enqueueAssignmentNotification(task, user);
        }
      }

      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { assigneeId } = req.body;

      if (!assigneeId) {
        res.status(400).json({ error: 'assigneeId is required' });
        return;
      }

      const task = await taskRepository.findById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      const updatedTask = await taskRepository.updateAssignee(id, assigneeId);
      const user = await userRepository.findById(assigneeId);
      if (user) {
        await notificationService.enqueueAssignmentNotification(updatedTask, user);
      }

      res.status(200).json(updatedTask);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createTasksRouter;
