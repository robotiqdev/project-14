import { Injectable } from '@nestjs/common';

@Injectable()
export class TaskAccessService {
  async upsertAccess(
    taskId: string,
    userId: string,
    grantType: string,
    permissions: string[],
    expiresAt: Date | null,
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async downgradeToReadOnly(
    taskId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<void> {
    throw new Error('Not implemented');
  }
}
