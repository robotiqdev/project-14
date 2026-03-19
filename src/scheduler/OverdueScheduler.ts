import * as nodeCron from 'node-cron';
import { IUserRepository } from '../repositories/UserRepository';
import { IOverdueDetectionService } from '../services/OverdueDetectionService';

export class TimezoneWindowResolver {
  static getZonesAt9AM(now: Date): string[] {
    const allZones: string[] = (Intl as any).supportedValuesOf('timeZone');
    const result: string[] = [];
    for (const zone of allZones) {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: zone,
      }).format(now);
      if (formatted === '09:00') {
        result.push(zone);
      }
    }
    return result;
  }
}

export class OverdueScheduler {
  private cronJob: any;

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly overdueService: IOverdueDetectionService,
  ) {}

  start(): void {
    this.cronJob = nodeCron.schedule('* * * * *', () => this.tick());
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }

  async tick(): Promise<void> {
    const now = new Date();
    const zones = TimezoneWindowResolver.getZonesAt9AM(now);
    const users = await this.userRepo.findByTimezones(zones);
    for (const user of users) {
      await this.overdueService.detectForUser(user);
    }
  }
}
