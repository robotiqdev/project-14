import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAccess } from '../../task-access/entities/task-access.entity';

@Injectable()
export class TaskOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(TaskAccess)
    private readonly taskAccessRepository: Repository<TaskAccess>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
