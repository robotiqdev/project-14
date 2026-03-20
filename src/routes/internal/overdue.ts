import { Router, Request, Response, NextFunction } from 'express';
import { ITaskRepository } from '../../repositories/TaskRepository';
import { IOverdueDetectionService } from '../../services/OverdueDetectionService';
import { internalAuth } from '../../middleware/internalAuth';

export interface OverdueRouteDeps {
  taskRepository: ITaskRepository;
  overdueDetectionService: IOverdueDetectionService;
}

export function createOverdueRouter(deps: OverdueRouteDeps): Router {
  const router = Router();
  const { taskRepository, overdueDetectionService } = deps;

  router.post('/', internalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dry_run, timezone } = req.body;

      if (dry_run) {
        const tasks = await taskRepository.findOverdueTasks();
        res.status(200).json({ detected: tasks.length, enqueued: 0, skipped: 0, errors: [] });
        return;
      }

      if (timezone) {
        const result = await overdueDetectionService.detectForTimezone(timezone);
        res.status(200).json(result);
        return;
      }

      const result = await overdueDetectionService.detectAll();
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export default createOverdueRouter;
