import { Request, Response, NextFunction } from 'express';
import { ITaskArchiveService } from '../../services/task-archive.service';

export class TaskController {
  constructor(private readonly taskArchiveService: ITaskArchiveService) {}

  archiveTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const actorId = req.user!.id;
      const task = await this.taskArchiveService.archiveTask(id, actorId);
      res.status(200).json(task);
    } catch (err) {
      next(err);
    }
  };
}
