import { ITaskRepository, TaskWithAssignee } from '../repositories/TaskRepository';
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

  private async processTasks(tasks: TaskWithAssignee[]): Promise<OverdueDetectionResult> {
    const result: OverdueDetectionResult = {
      detected: tasks.length,
      enqueued: 0,
      skipped: 0,
      errors: [],
    };

    for (const task of tasks) {
      try {
        const enqueueResult = await this.notificationService.enqueueIfNotAlreadySent(task);
        if (enqueueResult.enqueued) {
          result.enqueued++;
        } else if (enqueueResult.skipped) {
          result.skipped++;
        }
      } catch (err: any) {
        result.errors.push({ taskId: task.id, error: err.message || String(err) });
      }
    }

    return result;
  }

  async detectAll(): Promise<OverdueDetectionResult> {
    const tasks = await this.taskRepo.findOverdueTasks();
    return this.processTasks(tasks);
  }

  async detectForUser(user: User): Promise<OverdueDetectionResult> {
    const tasks = await this.taskRepo.findOverdueForUser(user.id);
    return this.processTasks(tasks);
  }

  async detectForTimezone(timezone: string): Promise<OverdueDetectionResult> {
    if (!this.userRepo) {
      throw new Error('UserRepository is required for detectForTimezone');
    }
    const users = await this.userRepo.findByTimezones([timezone]);
    const allResults: OverdueDetectionResult = { detected: 0, enqueued: 0, skipped: 0, errors: [] };
    for (const user of users) {
      const r = await this.detectForUser(user);
      allResults.detected += r.detected;
      allResults.enqueued += r.enqueued;
      allResults.skipped += r.skipped;
      allResults.errors.push(...r.errors);
    }
    return allResults;
  }
}
