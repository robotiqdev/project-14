import {
  IAssignment,
  IAssignTaskDTO,
  IReassignTaskDTO,
  IUnassignTaskDTO,
  IAuditService,
  INotificationService,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  AssignmentNotFoundError,
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
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) {
      throw new TaskNotFoundError();
    }

    const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
    if (!assignee || !assignee.isActive) {
      throw new AssigneeNotActiveTeamMemberError();
    }

    const assignment = await this.assignmentRepository.createAssignment({
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assignedById: actorId,
    });

    await this.auditService.log('task.assigned', {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      actorId,
    });

    await this.notificationService.notifyAssigned(dto.assigneeId, dto.taskId, actorId);

    return assignment;
  }

  async reassignTask(dto: IReassignTaskDTO, actorId: string): Promise<IAssignment> {
    const existing = await this.assignmentRepository.getActiveAssignmentByTask(dto.taskId);
    if (!existing) {
      throw new AssignmentNotFoundError();
    }

    const newAssignee = await this.prisma.user.findUnique({ where: { id: dto.newAssigneeId } });
    if (!newAssignee || !newAssignee.isActive) {
      throw new AssigneeNotActiveTeamMemberError();
    }

    await this.assignmentRepository.markUnassigned(existing.id, new Date(), 'reassigned');

    const newAssignment = await this.assignmentRepository.createAssignment({
      taskId: dto.taskId,
      assigneeId: dto.newAssigneeId,
      assignedById: actorId,
    });

    await this.auditService.log('task.reassigned', {
      taskId: dto.taskId,
      oldAssigneeId: existing.assigneeId,
      newAssigneeId: dto.newAssigneeId,
      actorId,
    });

    await this.notificationService.notifyReassigned(
      existing.assigneeId,
      dto.newAssigneeId,
      dto.taskId,
      actorId,
    );

    return newAssignment;
  }

  async unassignTask(dto: IUnassignTaskDTO, actorId: string): Promise<void> {
    const existing = await this.assignmentRepository.getActiveAssignmentByTask(dto.taskId);
    if (!existing) {
      throw new AssignmentNotFoundError();
    }

    await this.assignmentRepository.markUnassigned(existing.id, new Date(), dto.reason);

    await this.auditService.log('task.unassigned', {
      taskId: dto.taskId,
      assigneeId: existing.assigneeId,
      actorId,
    });

    await this.notificationService.notifyUnassigned(existing.assigneeId, dto.taskId, actorId);
  }

  async getActiveAssignment(taskId: string): Promise<IAssignment | null> {
    return this.assignmentRepository.getActiveAssignmentByTask(taskId);
  }

  async getAssignmentHistory(taskId: string): Promise<IAssignment[]> {
    return this.assignmentRepository.listAssignmentHistory(taskId);
  }
}
