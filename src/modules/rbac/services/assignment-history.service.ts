import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AssignmentHistory } from '../entities/assignment-history.entity';
import {
  CreateAssignmentHistoryInput,
  CloseAssignmentHistoryInput,
} from '../interfaces/assignment-history.interface';
import { TaskAccessService } from './task-access.service';

export const CURRENT_ASSIGNEE = 'CURRENT_ASSIGNEE';

export const ACCESS_REASON_ACTION_MATRIX: Record<string, string[]> = {
  [CURRENT_ASSIGNEE]: ['read', 'update', 'comment'],
};

@Injectable()
export class AssignmentHistoryService {
  constructor(
    @InjectRepository(AssignmentHistory)
    private readonly historyRepo: Repository<AssignmentHistory>,
    private readonly taskAccessService: TaskAccessService,
    private readonly configService: ConfigService,
  ) {}

  async recordAssignment(
    input: CreateAssignmentHistoryInput,
  ): Promise<AssignmentHistory> {
    const row = this.historyRepo.create({
      taskId: input.taskId,
      assigneeId: input.assigneeId,
      assignedById: input.assignedById,
      assignedAt: input.assignedAt,
      unassignedAt: null,
      reason: input.reason ?? null,
    });
    const saved = await this.historyRepo.save(row);
    await this.taskAccessService.upsertAccess(
      input.taskId,
      input.assigneeId,
      CURRENT_ASSIGNEE,
      ACCESS_REASON_ACTION_MATRIX[CURRENT_ASSIGNEE],
      null,
    );
    return saved;
  }

  async recordUnassignment(input: CloseAssignmentHistoryInput): Promise<void> {
    await this.historyRepo.update(
      { taskId: input.taskId, assigneeId: input.assigneeId, unassignedAt: IsNull() },
      { unassignedAt: input.unassignedAt, unassignedById: input.unassignedById, reason: input.reason },
    );
    const windowDays = this.configService.get<number>('RBAC_PREVIOUS_ASSIGNEE_WINDOW_DAYS', 90);
    const expiresAt = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);
    await this.taskAccessService.downgradeToReadOnly(input.taskId, input.assigneeId, expiresAt);
  }

  async getPreviousAssignees(taskId: string): Promise<string[]> {
    const rows = await this.historyRepo.find({
      where: { taskId, unassignedAt: Not(IsNull()) },
    });
    return [...new Set(rows.map((r) => r.assigneeId))];
  }

  async getFullHistory(taskId: string): Promise<AssignmentHistory[]> {
    return this.historyRepo.find({
      where: { taskId },
      order: { assignedAt: 'DESC' },
      relations: ['assignee', 'assignedBy'],
    });
  }
}
