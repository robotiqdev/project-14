import { Request, Response, NextFunction } from 'express';
import { ITaskArchiveService } from '../../services/task-archive.service';

export class TaskController {
  constructor(private readonly taskArchiveService: ITaskArchiveService) {}

  archiveTask = async (_req: Request, _res: Response, _next: NextFunction): Promise<void> => {
    throw new Error('Not implemented');
  };
}
