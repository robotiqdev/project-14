import { ITaskRepository } from '../repositories/TaskRepository';
import { IUserRepository, User } from '../repositories/UserRepository';
import { INotificationService } from './NotificationService';

export interface OverdueDetectionResult {
  detected: number;
  enqueued: number;
  skipped: number;
  errors: Array<{ taskId: string; error: string }>;
}

export interface IOverdueDetectionService {
  detectAll(): Promise<OverdueDetectionResult>;
  detectForUser(user: User): Promise<OverdueDetectionResult>;
  detectForTimezone(timezone: string): Promise<OverdueDetectionResult>;
}

export class OverdueDetectionService implements IOverdueDetectionService {
  constructor(
    private readonly taskRepo: ITaskRepository,
    private readonly notificationService: INotificationService,
    private readonly userRepo?: IUserRepository,
  ) {}

  async detectAll(): Promise<OverdueDetectionResult> {
    throw new Error('Not implemented');
  }

  async detectForUser(user: User): Promise<OverdueDetectionResult> {
    throw new Error('Not implemented');
  }

  async detectForTimezone(timezone: string): Promise<OverdueDetectionResult> {
    throw new Error('Not implemented');
  }
}
