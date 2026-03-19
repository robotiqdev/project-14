import {
  IAssignment,
  IAssignTaskDTO,
  IReassignTaskDTO,
  IUnassignTaskDTO,
  IAuditService,
  INotificationService,
} from '../../shared/types/assignment.types';
import { AssignmentRepository } from './assignment.repository';

export class AssignmentService {
  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly prisma: any,
  ) {}

  async assignTask(dto: IAssignTaskDTO, actorId: string): Promise<IAssignment> {
    throw new Error('Not implemented');
  }

  async reassignTask(dto: IReassignTaskDTO, actorId: string): Promise<IAssignment> {
    throw new Error('Not implemented');
  }

  async unassignTask(dto: IUnassignTaskDTO, actorId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getActiveAssignment(taskId: string): Promise<IAssignment | null> {
    throw new Error('Not implemented');
  }

  async getAssignmentHistory(taskId: string): Promise<IAssignment[]> {
    throw new Error('Not implemented');
  }
}
