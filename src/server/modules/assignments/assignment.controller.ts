import { Request, Response } from 'express';
import { AssignmentService } from './assignment.service';
import {
  AssignmentNotFoundError,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  PermissionDeniedError,
} from '../../shared/types/assignment.types';

type ActorRequest = Request & { actorId?: string };

export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  async assign(req: ActorRequest, res: Response): Promise<void> {
    try {
      if (!req.body || !req.body.assigneeId || req.body.assigneeId === '') {
        res.status(400).json({ error: 'assigneeId is required' });
        return;
      }

      const taskId = req.params.taskId;
      const { assigneeId } = req.body;
      const actorId = req.actorId ?? '';

      const assignment = await this.assignmentService.assignTask(
        { taskId, assigneeId },
        actorId,
      );
      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        res.status(404).json({ error: (err as Error).message });
      } else if (err instanceof AssigneeNotActiveTeamMemberError) {
        res.status(400).json({ error: (err as Error).message });
      } else if (err instanceof PermissionDeniedError) {
        res.status(403).json({ error: (err as Error).message });
      } else {
        throw err;
      }
    }
  }

  async reassign(req: ActorRequest, res: Response): Promise<void> {
    try {
      if (!req.body || !req.body.newAssigneeId || req.body.newAssigneeId === '') {
        res.status(400).json({ error: 'newAssigneeId is required' });
        return;
      }

      const taskId = req.params.taskId;
      const { newAssigneeId, reason } = req.body;
      const actorId = req.actorId ?? '';

      const assignment = await this.assignmentService.reassignTask(
        { taskId, newAssigneeId, reason },
        actorId,
      );
      res.status(200).json(assignment);
    } catch (err) {
      if (err instanceof TaskNotFoundError || err instanceof AssignmentNotFoundError) {
        res.status(404).json({ error: (err as Error).message });
      } else if (err instanceof AssigneeNotActiveTeamMemberError) {
        res.status(400).json({ error: (err as Error).message });
      } else if (err instanceof PermissionDeniedError) {
        res.status(403).json({ error: (err as Error).message });
      } else {
        throw err;
      }
    }
  }

  async unassign(req: ActorRequest, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId;
      const reason = req.body?.reason;
      const actorId = req.actorId ?? '';

      await this.assignmentService.unassignTask({ taskId, reason }, actorId);
      res.status(204).send();
    } catch (err) {
      if (err instanceof TaskNotFoundError || err instanceof AssignmentNotFoundError) {
        res.status(404).json({ error: (err as Error).message });
      } else if (err instanceof PermissionDeniedError) {
        res.status(403).json({ error: (err as Error).message });
      } else {
        throw err;
      }
    }
  }

  async getAssignment(req: ActorRequest, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId;

      const assignment = await this.assignmentService.getActiveAssignment(taskId);
      if (!assignment) {
        res.status(404).json({ error: 'No active assignment found' });
        return;
      }
      res.status(200).json(assignment);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        res.status(404).json({ error: (err as Error).message });
      } else {
        throw err;
      }
    }
  }

  async getHistory(req: ActorRequest, res: Response): Promise<void> {
    try {
      const taskId = req.params.taskId;

      const history = await this.assignmentService.getAssignmentHistory(taskId);
      res.status(200).json(history);
    } catch (err) {
      if (err instanceof TaskNotFoundError) {
        res.status(404).json({ error: (err as Error).message });
      } else {
        throw err;
      }
    }
  }
}

export {
  AssignmentNotFoundError,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  PermissionDeniedError,
};
