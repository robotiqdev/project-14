import { IAssignment } from '../../shared/types/assignment.types';

export interface CreateAssignmentData {
  taskId: string;
  assigneeId: string;
  assignedById: string;
  assignedAt?: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class AssignmentRepository {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly prisma: any) {}

  async createAssignment(data: CreateAssignmentData): Promise<IAssignment> {
    throw new Error('Not implemented');
  }

  async markUnassigned(
    id: string,
    unassignedAt: Date,
    reason?: string,
  ): Promise<IAssignment> {
    throw new Error('Not implemented');
  }

  async getActiveAssignmentByTask(taskId: string): Promise<IAssignment | null> {
    throw new Error('Not implemented');
  }

  async listAssignmentHistory(taskId: string): Promise<IAssignment[]> {
    throw new Error('Not implemented');
  }

  async getAssignmentsByAssignee(
    assigneeId: string,
    onlyActive: boolean,
  ): Promise<IAssignment[]> {
    throw new Error('Not implemented');
  }
}
