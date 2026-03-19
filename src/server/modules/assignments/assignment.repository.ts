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
    const record = await this.prisma.taskAssignment.create({
      data: {
        taskId: data.taskId,
        assigneeId: data.assigneeId,
        assignedById: data.assignedById,
        ...(data.assignedAt !== undefined ? { assignedAt: data.assignedAt } : {}),
      },
    });
    return record;
  }

  async markUnassigned(
    id: string,
    unassignedAt: Date,
    reason?: string,
  ): Promise<IAssignment> {
    const record = await this.prisma.taskAssignment.update({
      where: { id },
      data: {
        unassignedAt,
        ...(reason !== undefined ? { unassignReason: reason } : {}),
      },
    });
    return record;
  }

  async getActiveAssignmentByTask(taskId: string): Promise<IAssignment | null> {
    const record = await this.prisma.taskAssignment.findFirst({
      where: { taskId, unassignedAt: null },
      orderBy: { assignedAt: 'desc' },
    });
    return record;
  }

  async listAssignmentHistory(taskId: string): Promise<IAssignment[]> {
    const records = await this.prisma.taskAssignment.findMany({
      where: { taskId },
      orderBy: { assignedAt: 'desc' },
    });
    return records;
  }

  async getAssignmentsByAssignee(
    assigneeId: string,
    onlyActive: boolean,
  ): Promise<IAssignment[]> {
    const records = await this.prisma.taskAssignment.findMany({
      where: {
        assigneeId,
        ...(onlyActive ? { unassignedAt: null } : {}),
      },
    });
    return records;
  }
}
