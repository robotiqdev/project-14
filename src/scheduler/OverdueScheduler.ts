import { IUserRepository } from '../repositories/UserRepository';
import { IOverdueDetectionService } from '../services/OverdueDetectionService';

export class TimezoneWindowResolver {
  static getZonesAt9AM(now: Date): string[] {
    throw new Error('Not implemented');
  }
}

export class OverdueScheduler {
  private cronJob: any;

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly overdueService: IOverdueDetectionService,
  ) {}

  start(): void {
    throw new Error('Not implemented');
  }

  stop(): void {
    throw new Error('Not implemented');
  }

  async tick(): Promise<void> {
    throw new Error('Not implemented');
  }
}
