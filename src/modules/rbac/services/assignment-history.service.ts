import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
    throw new Error('Not implemented');
  }

  async recordUnassignment(input: CloseAssignmentHistoryInput): Promise<void> {
    throw new Error('Not implemented');
  }

  async getPreviousAssignees(taskId: string): Promise<string[]> {
    throw new Error('Not implemented');
  }

  async getFullHistory(taskId: string): Promise<AssignmentHistory[]> {
    throw new Error('Not implemented');
  }
}
