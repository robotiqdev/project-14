import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import {
  AssignmentHistoryService,
  CURRENT_ASSIGNEE,
  ACCESS_REASON_ACTION_MATRIX,
} from '../services/assignment-history.service';
import { AssignmentHistory } from '../entities/assignment-history.entity';
import { TaskAccessService } from '../services/task-access.service';
import {
  CreateAssignmentHistoryInput,
  CloseAssignmentHistoryInput,
} from '../interfaces/assignment-history.interface';

describe('AssignmentHistoryService', () => {
  let service: AssignmentHistoryService;
  let historyRepo: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    find: jest.Mock;
  };
  let taskAccessService: jest.Mocked<TaskAccessService>;
  let configService: jest.Mocked<ConfigService>;

  const FROZEN_DATE = new Date('2024-01-01T00:00:00.000Z');

  const TASK_ID = 'task-uuid-1234';
  const ASSIGNEE_ID = 'assignee-uuid-5678';
  const ASSIGNED_BY_ID = 'assigner-uuid-9012';
  const UNASSIGNED_BY_ID = 'unassigner-uuid-3456';

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(FROZEN_DATE);

    historyRepo = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };

    taskAccessService = {
      upsertAccess: jest.fn().mockResolvedValue(undefined),
      downgradeToReadOnly: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TaskAccessService>;

    configService = {
      get: jest.fn().mockReturnValue(90),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentHistoryService,
        {
          provide: getRepositoryToken(AssignmentHistory),
          useValue: historyRepo,
        },
        {
          provide: TaskAccessService,
          useValue: taskAccessService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AssignmentHistoryService>(AssignmentHistoryService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // recordAssignment
  // ──────────────────────────────────────────────────────────────────────────

  describe('recordAssignment', () => {
    it('should save a history row with taskId, assigneeId, assignedAt and unassignedAt=null', async () => {
      const assignedAt = new Date('2024-01-01T10:00:00.000Z');
      const input: CreateAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt,
        reason: 'Initial assignment',
      };

      const createdRow = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt,
        unassignedAt: null,
        reason: 'Initial assignment',
      };
      const savedRow = { id: 'new-uuid', ...createdRow };

      historyRepo.create.mockReturnValue(createdRow);
      historyRepo.save.mockResolvedValue(savedRow);

      await service.recordAssignment(input);

      // repo.create should be called with all required fields and unassignedAt=null
      expect(historyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: TASK_ID,
          assigneeId: ASSIGNEE_ID,
          assignedAt,
          unassignedAt: null,
        }),
      );

      // repo.save should be called with the created row
      expect(historyRepo.save).toHaveBeenCalledWith(createdRow);
    });

    it('should call taskAccessService.upsertAccess with (taskId, assigneeId, CURRENT_ASSIGNEE, [read, update, comment], null)', async () => {
      const assignedAt = new Date('2024-01-01T10:00:00.000Z');
      const input: CreateAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt,
      };

      const createdRow = { taskId: TASK_ID, assigneeId: ASSIGNEE_ID, assignedAt, unassignedAt: null };
      historyRepo.create.mockReturnValue(createdRow);
      historyRepo.save.mockResolvedValue({ id: 'new-uuid', ...createdRow });

      await service.recordAssignment(input);

      expect(taskAccessService.upsertAccess).toHaveBeenCalledWith(
        TASK_ID,
        ASSIGNEE_ID,
        CURRENT_ASSIGNEE,
        ACCESS_REASON_ACTION_MATRIX[CURRENT_ASSIGNEE],
        null,
      );
    });

    it('should call taskAccessService.upsertAccess with permissions [read, update, comment]', async () => {
      const input: CreateAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt: new Date(),
      };

      historyRepo.create.mockReturnValue({});
      historyRepo.save.mockResolvedValue({ id: 'new-uuid' });

      await service.recordAssignment(input);

      const upsertCall = taskAccessService.upsertAccess.mock.calls[0];
      const permissions = upsertCall[3] as string[];
      expect(permissions).toEqual(expect.arrayContaining(['read', 'update', 'comment']));
      expect(permissions).toHaveLength(3);
    });

    it('should pass null as expiresAt when calling upsertAccess (current assignees do not expire)', async () => {
      const input: CreateAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt: new Date(),
      };

      historyRepo.create.mockReturnValue({});
      historyRepo.save.mockResolvedValue({ id: 'new-uuid' });

      await service.recordAssignment(input);

      const upsertCall = taskAccessService.upsertAccess.mock.calls[0];
      expect(upsertCall[4]).toBeNull();
    });

    it('should save history row without reason when reason is not provided', async () => {
      const input: CreateAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        assignedById: ASSIGNED_BY_ID,
        assignedAt: new Date(),
      };

      historyRepo.create.mockReturnValue({ unassignedAt: null });
      historyRepo.save.mockResolvedValue({ id: 'new-uuid', unassignedAt: null });

      await service.recordAssignment(input);

      expect(historyRepo.save).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // recordUnassignment
  // ──────────────────────────────────────────────────────────────────────────

  describe('recordUnassignment', () => {
    it('should call historyRepo.update with the correct where clause { taskId, assigneeId, unassignedAt: IsNull() }', async () => {
      const unassignedAt = new Date('2024-01-02T10:00:00.000Z');
      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt,
        reason: 'Reassigned',
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });

      await service.recordUnassignment(input);

      expect(historyRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: TASK_ID,
          assigneeId: ASSIGNEE_ID,
          unassignedAt: IsNull(),
        }),
        expect.anything(),
      );
    });

    it('should call historyRepo.update with the correct update payload { unassignedAt, unassignedById, reason }', async () => {
      const unassignedAt = new Date('2024-01-02T10:00:00.000Z');
      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt,
        reason: 'Reassigned',
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });

      await service.recordUnassignment(input);

      expect(historyRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          unassignedAt,
          unassignedById: UNASSIGNED_BY_ID,
          reason: 'Reassigned',
        }),
      );
    });

    it('should call taskAccessService.downgradeToReadOnly with expiresAt exactly 90 days from frozen Date.now()', async () => {
      const unassignedAt = new Date('2024-01-02T10:00:00.000Z');
      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt,
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });
      configService.get.mockReturnValue(90);

      await service.recordUnassignment(input);

      // expiresAt = FROZEN_DATE + 90 days
      const expectedExpiresAt = new Date(FROZEN_DATE.getTime() + 90 * 24 * 60 * 60 * 1000);

      expect(taskAccessService.downgradeToReadOnly).toHaveBeenCalledWith(
        TASK_ID,
        ASSIGNEE_ID,
        expectedExpiresAt,
      );
    });

    it('should respect RBAC_PREVIOUS_ASSIGNEE_WINDOW_DAYS config — when config returns 30, expiresAt = now + 30 days', async () => {
      // Override configService to return 30 days
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'RBAC_PREVIOUS_ASSIGNEE_WINDOW_DAYS') return 30;
        return defaultValue;
      });

      const unassignedAt = new Date('2024-01-02T10:00:00.000Z');
      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt,
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });

      await service.recordUnassignment(input);

      // expiresAt = FROZEN_DATE + 30 days
      const expectedExpiresAt = new Date(FROZEN_DATE.getTime() + 30 * 24 * 60 * 60 * 1000);

      expect(taskAccessService.downgradeToReadOnly).toHaveBeenCalledWith(
        TASK_ID,
        ASSIGNEE_ID,
        expectedExpiresAt,
      );
    });

    it('should use default 90 days when RBAC_PREVIOUS_ASSIGNEE_WINDOW_DAYS is not configured', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'RBAC_PREVIOUS_ASSIGNEE_WINDOW_DAYS') return defaultValue ?? 90;
        return defaultValue;
      });

      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt: new Date(),
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });

      await service.recordUnassignment(input);

      const expectedExpiresAt = new Date(FROZEN_DATE.getTime() + 90 * 24 * 60 * 60 * 1000);
      const downgradeCall = taskAccessService.downgradeToReadOnly.mock.calls[0];
      const actualExpiresAt = downgradeCall[2] as Date;

      expect(actualExpiresAt.getTime()).toBe(expectedExpiresAt.getTime());
    });

    it('should not throw when reason is not provided', async () => {
      const input: CloseAssignmentHistoryInput = {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
        unassignedById: UNASSIGNED_BY_ID,
        unassignedAt: new Date(),
      };

      historyRepo.update.mockResolvedValue({ affected: 1 });

      await expect(service.recordUnassignment(input)).resolves.not.toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getPreviousAssignees
  // ──────────────────────────────────────────────────────────────────────────

  describe('getPreviousAssignees', () => {
    it('should return a deduplicated array of assigneeIds from rows with unassignedAt IS NOT NULL', async () => {
      const rows: Partial<AssignmentHistory>[] = [
        { assigneeId: 'user-A', taskId: TASK_ID, unassignedAt: new Date('2024-01-01') },
        { assigneeId: 'user-B', taskId: TASK_ID, unassignedAt: new Date('2024-01-02') },
        { assigneeId: 'user-A', taskId: TASK_ID, unassignedAt: new Date('2024-01-03') }, // duplicate
        { assigneeId: 'user-C', taskId: TASK_ID, unassignedAt: new Date('2024-01-04') },
      ];

      historyRepo.find.mockResolvedValue(rows);

      const result = await service.getPreviousAssignees(TASK_ID);

      // Should be deduplicated — user-A appears only once
      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(['user-A', 'user-B', 'user-C']));
      expect(result.filter((id) => id === 'user-A')).toHaveLength(1);
    });

    it('should query only rows where unassignedAt IS NOT NULL', async () => {
      historyRepo.find.mockResolvedValue([]);

      await service.getPreviousAssignees(TASK_ID);

      expect(historyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskId: TASK_ID,
          }),
        }),
      );
    });

    it('should return an empty array when there are no previous assignees', async () => {
      historyRepo.find.mockResolvedValue([]);

      const result = await service.getPreviousAssignees(TASK_ID);

      expect(result).toEqual([]);
    });

    it('should return a single assigneeId without duplicates when all rows have the same assignee', async () => {
      const rows: Partial<AssignmentHistory>[] = [
        { assigneeId: 'user-A', taskId: TASK_ID, unassignedAt: new Date('2024-01-01') },
        { assigneeId: 'user-A', taskId: TASK_ID, unassignedAt: new Date('2024-01-05') },
        { assigneeId: 'user-A', taskId: TASK_ID, unassignedAt: new Date('2024-01-10') },
      ];

      historyRepo.find.mockResolvedValue(rows);

      const result = await service.getPreviousAssignees(TASK_ID);

      expect(result).toHaveLength(1);
      expect(result).toEqual(['user-A']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getFullHistory
  // ──────────────────────────────────────────────────────────────────────────

  describe('getFullHistory', () => {
    it('should return rows ordered by assignedAt DESC as provided by the repository', async () => {
      const rows: Partial<AssignmentHistory>[] = [
        {
          id: 'row-3',
          taskId: TASK_ID,
          assigneeId: 'user-C',
          assignedAt: new Date('2024-01-03'),
          unassignedAt: null,
        },
        {
          id: 'row-2',
          taskId: TASK_ID,
          assigneeId: 'user-B',
          assignedAt: new Date('2024-01-02'),
          unassignedAt: new Date('2024-01-03'),
        },
        {
          id: 'row-1',
          taskId: TASK_ID,
          assigneeId: 'user-A',
          assignedAt: new Date('2024-01-01'),
          unassignedAt: new Date('2024-01-02'),
        },
      ];

      historyRepo.find.mockResolvedValue(rows);

      const result = await service.getFullHistory(TASK_ID);

      // Should return exactly the array returned by the repo (already ordered DESC)
      expect(result).toStrictEqual(rows);
    });

    it('should query for the correct taskId', async () => {
      historyRepo.find.mockResolvedValue([]);

      await service.getFullHistory(TASK_ID);

      expect(historyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskId: TASK_ID,
          }),
        }),
      );
    });

    it('should request results ordered by assignedAt DESC', async () => {
      historyRepo.find.mockResolvedValue([]);

      await service.getFullHistory(TASK_ID);

      expect(historyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            assignedAt: expect.stringMatching(/^desc$/i),
          }),
        }),
      );
    });

    it('should load assignee and assignedBy relations', async () => {
      historyRepo.find.mockResolvedValue([]);

      await service.getFullHistory(TASK_ID);

      expect(historyRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.arrayContaining(['assignee', 'assignedBy']),
        }),
      );
    });

    it('should return an empty array when there is no history for the task', async () => {
      historyRepo.find.mockResolvedValue([]);

      const result = await service.getFullHistory(TASK_ID);

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────────────────────────────────

  describe('CURRENT_ASSIGNEE constant', () => {
    it('should export CURRENT_ASSIGNEE as a non-empty string', () => {
      expect(CURRENT_ASSIGNEE).toBeDefined();
      expect(typeof CURRENT_ASSIGNEE).toBe('string');
      expect(CURRENT_ASSIGNEE.length).toBeGreaterThan(0);
    });
  });

  describe('ACCESS_REASON_ACTION_MATRIX', () => {
    it('should map CURRENT_ASSIGNEE to [read, update, comment]', () => {
      expect(ACCESS_REASON_ACTION_MATRIX[CURRENT_ASSIGNEE]).toEqual(
        expect.arrayContaining(['read', 'update', 'comment']),
      );
      expect(ACCESS_REASON_ACTION_MATRIX[CURRENT_ASSIGNEE]).toHaveLength(3);
    });
  });
});
