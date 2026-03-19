import { Router } from 'express';
import { ITaskRepository } from '../../repositories/TaskRepository';
import { IOverdueDetectionService } from '../../services/OverdueDetectionService';

export interface OverdueRouteDeps {
  taskRepository: ITaskRepository;
  overdueDetectionService: IOverdueDetectionService;
}

export function createOverdueRouter(deps: OverdueRouteDeps): Router {
  const router = Router();
  return router;
}

export default createOverdueRouter;
