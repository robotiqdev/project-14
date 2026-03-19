import { Request, Response } from 'express';
import { AssignmentService } from './assignment.service';
import {
  AssignmentNotFoundError,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  PermissionDeniedError,
} from '../../shared/types/assignment.types';

export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  async assign(req: Request, res: Response): Promise<void> {
    throw new Error('Not implemented');
  }

  async reassign(req: Request, res: Response): Promise<void> {
    throw new Error('Not implemented');
  }

  async unassign(req: Request, res: Response): Promise<void> {
    throw new Error('Not implemented');
  }

  async getAssignment(req: Request, res: Response): Promise<void> {
    throw new Error('Not implemented');
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    throw new Error('Not implemented');
  }
}

export {
  AssignmentNotFoundError,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  PermissionDeniedError,
};
