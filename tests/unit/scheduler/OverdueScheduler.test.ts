import { OverdueScheduler, TimezoneWindowResolver } from '../../../src/scheduler/OverdueScheduler';
import { IUserRepository, User } from '../../../src/repositories/UserRepository';
import { IOverdueDetectionService, OverdueDetectionResult } from '../../../src/services/OverdueDetectionService';

// Mock node-cron before any imports
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    timezone: 'UTC',
    ...overrides,
  };
}

function makeDetectionResult(overrides: Partial<OverdueDetectionResult> = {}): OverdueDetectionResult {
  return {
    detected: 0,
    enqueued: 0,
    skipped: 0,
    errors: [],
    ...overrides,
  };
}

describe('TimezoneWindowResolver', () => {
  describe('getZonesAt9AM()', () => {
    it('should return America/New_York when the fixed date is 14:00 UTC (9 AM EST)', () => {
      // January 15, 2024 at 14:00 UTC = 09:00 AM EST (UTC-5, no DST in January)
      const fixedDate = new Date('2024-01-15T14:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      expect(zones).toContain('America/New_York');
    });

    it('should NOT return America/Los_Angeles when the fixed date is 14:00 UTC (6 AM PST, not 9 AM)', () => {
      // January 15, 2024 at 14:00 UTC = 06:00 AM PST (UTC-8, no DST in January)
      const fixedDate = new Date('2024-01-15T14:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      expect(zones).not.toContain('America/Los_Angeles');
    });

    it('should return America/Los_Angeles when the fixed date is 17:00 UTC (9 AM PST)', () => {
      // January 15, 2024 at 17:00 UTC = 09:00 AM PST (UTC-8)
      const fixedDate = new Date('2024-01-15T17:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      expect(zones).toContain('America/Los_Angeles');
    });

    it('should NOT return America/New_York when fixed date is 17:00 UTC (12 PM EST, not 9 AM)', () => {
      // January 15, 2024 at 17:00 UTC = 12:00 PM EST
      const fixedDate = new Date('2024-01-15T17:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      expect(zones).not.toContain('America/New_York');
    });

    it('should return an array', () => {
      const fixedDate = new Date('2024-01-15T14:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      expect(Array.isArray(zones)).toBe(true);
    });

    it('should only return zones where the local time is exactly 09:00', () => {
      const fixedDate = new Date('2024-01-15T14:00:00Z');

      const zones = TimezoneWindowResolver.getZonesAt9AM(fixedDate);

      for (const zone of zones) {
        const formatted = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: zone,
        }).format(fixedDate);
        expect(formatted).toBe('09:00');
      }
    });
  });
});

describe('OverdueScheduler', () => {
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockOverdueSvc: jest.Mocked<IOverdueDetectionService>;
  let scheduler: OverdueScheduler;
  let nodeCron: any;

  beforeEach(() => {
    nodeCron = require('node-cron');
    nodeCron.schedule.mockClear();

    mockUserRepo = {
      findById: jest.fn(),
      findByTimezones: jest.fn().mockResolvedValue([]),
    };

    mockOverdueSvc = {
      detectAll: jest.fn().mockResolvedValue(makeDetectionResult()),
      detectForUser: jest.fn().mockResolvedValue(makeDetectionResult()),
      detectForTimezone: jest.fn().mockResolvedValue(makeDetectionResult()),
    };

    scheduler = new OverdueScheduler(mockUserRepo, mockOverdueSvc);
  });

  describe('tick()', () => {
    it('should call UserRepository.findByTimezones with the zones resolved for 9 AM', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T14:00:00Z'));

      await scheduler.tick();

      expect(mockUserRepo.findByTimezones).toHaveBeenCalledWith(
        expect.arrayContaining(['America/New_York']),
      );

      jest.useRealTimers();
    });

    it('should call detectForUser for each user returned by findByTimezones', async () => {
      const users: User[] = [
        makeUser({ id: 'u1', timezone: 'America/New_York' }),
        makeUser({ id: 'u2', timezone: 'America/New_York' }),
      ];
      mockUserRepo.findByTimezones.mockResolvedValue(users);

      await scheduler.tick();

      expect(mockOverdueSvc.detectForUser).toHaveBeenCalledTimes(2);
      expect(mockOverdueSvc.detectForUser).toHaveBeenCalledWith(users[0]);
      expect(mockOverdueSvc.detectForUser).toHaveBeenCalledWith(users[1]);
    });

    it('should NOT call detectForUser if no users are returned', async () => {
      mockUserRepo.findByTimezones.mockResolvedValue([]);

      await scheduler.tick();

      expect(mockOverdueSvc.detectForUser).not.toHaveBeenCalled();
    });

    it('should call findByTimezones with resolved zones array', async () => {
      await scheduler.tick();

      expect(mockUserRepo.findByTimezones).toHaveBeenCalledWith(expect.any(Array));
    });
  });

  describe('start()', () => {
    it('should schedule a cron job using node-cron schedule()', () => {
      scheduler.start();

      expect(nodeCron.schedule).toHaveBeenCalledTimes(1);
    });

    it('should schedule the cron with a "* * * * *" (every minute) pattern', () => {
      scheduler.start();

      expect(nodeCron.schedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
    });

    it('should invoke tick() when the scheduled cron callback fires', async () => {
      let capturedCallback: Function | undefined;
      nodeCron.schedule.mockImplementation((pattern: string, cb: Function) => {
        capturedCallback = cb;
        return { stop: jest.fn() };
      });

      scheduler.start();

      expect(capturedCallback).toBeDefined();

      // Manually trigger the cron callback
      await capturedCallback!();

      expect(mockUserRepo.findByTimezones).toHaveBeenCalled();
    });
  });
});
