import { Router, Request, Response, NextFunction } from 'express';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

export function createAssignmentRouter(
  assignmentService: AssignmentService,
): Router {
  const router = Router();
  const controller = new AssignmentController(assignmentService);

  // Auth middleware stub — replace with real middleware in production
  const authMiddleware = (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };

  // Permission middleware stub — replace with real middleware in production
  const permissionMiddleware = (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };

  router.post(
    '/tasks/:taskId/assign',
    authMiddleware,
    permissionMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      controller.assign(req, res).catch(next),
  );

  router.put(
    '/tasks/:taskId/reassign',
    authMiddleware,
    permissionMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      controller.reassign(req, res).catch(next),
  );

  router.delete(
    '/tasks/:taskId/unassign',
    authMiddleware,
    permissionMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      controller.unassign(req, res).catch(next),
  );

  router.get(
    '/tasks/:taskId/assignment',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getAssignment(req, res).catch(next),
  );

  router.get(
    '/tasks/:taskId/assignment-history',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      controller.getHistory(req, res).catch(next),
  );

  return router;
}
