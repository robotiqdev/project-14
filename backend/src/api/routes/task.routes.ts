import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireTeamLead } from '../middleware/requireTeamLead';
import { TaskController } from '../controllers/task.controller';
import { ITaskArchiveService } from '../../services/task-archive.service';

export function createTaskRouter(taskArchiveService: ITaskArchiveService): Router {
  const router = Router();
  const controller = new TaskController(taskArchiveService);

  router.patch(
    '/:id/archive',
    requireAuth,
    requireTeamLead,
    controller.archiveTask,
  );

  return router;
}
