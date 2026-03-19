import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Action } from '../../../common/enums/action.enum';
import { PermissionCheckInput } from '../interfaces/permission-check.interface';
import { PermissionResult } from '../interfaces/permission-result.interface';
import { TaskAccessRecord } from '../interfaces/task-access-record.interface';
import { IPermissionService } from './permission.service.interface';
import { ITaskAccessService } from './task-access.service.interface';

@Injectable()
export class PermissionService implements IPermissionService {
  constructor(
    private readonly taskAccessService: ITaskAccessService,
    private readonly configService: ConfigService,
  ) {}

  async checkPermission(input: PermissionCheckInput): Promise<PermissionResult> {
    throw new Error('Not implemented');
  }

  async getAllowedActions(userId: string, taskId: string): Promise<Record<string, boolean>> {
    throw new Error('Not implemented');
  }

  async grantOwnerAccess(taskId: string, ownerId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async grantAssigneeAccess(taskId: string, userId: string, grantedById: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async revokeAssigneeAccess(taskId: string, userId: string, revokedById: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async grantTeamLeadAccess(taskId: string, teamLeadId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async revokeTeamLeadAccess(taskId: string, teamLeadId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getTaskAccessors(taskId: string): Promise<TaskAccessRecord[]> {
    throw new Error('Not implemented');
  }
}
