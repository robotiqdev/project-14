import { ConfigService } from '@nestjs/config';
import { Action } from '../../../common/enums/action.enum';
import { TaskAccess } from '../../task-access/entities/task-access.entity';
import { ACCESS_REASON_ACTION_MATRIX } from '../constants/access-reason-action-matrix';
import { TaskAccessReason } from '../enums/task-access-reason.enum';
import { PermissionService } from '../services/permission.service';

describe('PermissionService', () => {
  let permissionService: PermissionService;

  const mockTaskAccessService = {
    findActiveRecord: jest.fn(),
    upsertAccess: jest.fn(),
    downgradeToReadOnly: jest.fn(),
    deactivate: jest.fn(),
    findAllForTask: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    permissionService = new PermissionService(
      mockTaskAccessService as any,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('checkPermission', () => {
    it('returns { allowed: false, reason: null } when no access record exists', async () => {
      mockTaskAccessService.findActiveRecord.mockResolvedValue(null);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.READ,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeNull();
      expect(result.deniedBecause).toBeDefined();
    });

    it('returns { allowed: false } with "expired" in deniedBecause when expiresAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
        grantedActions: [Action.READ],
        expiresAt: pastDate,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.READ,
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBecause).toMatch(/expired/i);
    });

    it('returns { allowed: true } when action is in grantedActions and not expired', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // tomorrow
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
        grantedActions: [Action.READ, Action.WRITE],
        expiresAt: futureDate,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.READ,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe(TaskAccessReason.CURRENT_ASSIGNEE);
    });

    it('returns { allowed: true } when action is in grantedActions and expiresAt is null', async () => {
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.OWNER,
        grantedActions: Object.values(Action),
        expiresAt: null,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.DELETE,
      });

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe(TaskAccessReason.OWNER);
    });

    it('returns { allowed: false } when action is NOT in grantedActions', async () => {
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
        grantedActions: [Action.READ, Action.COMMENT],
        expiresAt: null,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.DELETE,
      });

      expect(result.allowed).toBe(false);
      expect(result.deniedBecause).toBeDefined();
    });

    it('returns the accessReason from the record in the result', async () => {
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.TEAM_LEAD,
        grantedActions: [Action.READ, Action.ASSIGN],
        expiresAt: null,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.checkPermission({
        userId: 'user-1',
        taskId: 'task-1',
        action: Action.ASSIGN,
      });

      expect(result.reason).toBe(TaskAccessReason.TEAM_LEAD);
    });
  });

  describe('getAllowedActions', () => {
    it('returns a map covering all Action enum values with correct booleans', async () => {
      const accessRecord: Partial<TaskAccess> = {
        taskId: 'task-1',
        userId: 'user-1',
        accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
        grantedActions: [Action.READ, Action.WRITE],
        expiresAt: null,
        isActive: true,
      };
      mockTaskAccessService.findActiveRecord.mockResolvedValue(accessRecord);

      const result = await permissionService.getAllowedActions('user-1', 'task-1');

      const allActions = Object.values(Action);
      for (const action of allActions) {
        expect(result).toHaveProperty(action);
        expect(typeof result[action]).toBe('boolean');
      }

      expect(result[Action.READ]).toBe(true);
      expect(result[Action.WRITE]).toBe(true);
      expect(result[Action.DELETE]).toBe(false);
    });

    it('returns all false when user has no access record', async () => {
      mockTaskAccessService.findActiveRecord.mockResolvedValue(null);

      const result = await permissionService.getAllowedActions('user-1', 'task-1');

      const allActions = Object.values(Action);
      for (const action of allActions) {
        expect(result[action]).toBe(false);
      }
    });
  });

  describe('grantOwnerAccess', () => {
    it('calls upsertAccess with OWNER reason, full action set, and null expiresAt', async () => {
      mockTaskAccessService.upsertAccess.mockResolvedValue({});

      await permissionService.grantOwnerAccess('task-1', 'owner-1');

      expect(mockTaskAccessService.upsertAccess).toHaveBeenCalledTimes(1);

      const callArgs = mockTaskAccessService.upsertAccess.mock.calls[0];
      expect(callArgs[0]).toBe('task-1');
      expect(callArgs[1]).toBe('owner-1');
      expect(callArgs[2]).toBe(TaskAccessReason.OWNER);

      const expectedActions = ACCESS_REASON_ACTION_MATRIX[TaskAccessReason.OWNER];
      expect(callArgs[3]).toEqual(expect.arrayContaining(expectedActions));
      expect(callArgs[3].length).toBe(expectedActions.length);

      // expiresAt should be null
      const expiresAtArg = callArgs.find(
        (arg: any) => arg === null || arg instanceof Date,
      );
      expect(expiresAtArg).toBeNull();
    });
  });

  describe('grantAssigneeAccess', () => {
    it('calls upsertAccess with CURRENT_ASSIGNEE reason and correct actions', async () => {
      mockTaskAccessService.upsertAccess.mockResolvedValue({});

      await permissionService.grantAssigneeAccess('task-1', 'user-1', 'granter-1');

      expect(mockTaskAccessService.upsertAccess).toHaveBeenCalledTimes(1);

      const callArgs = mockTaskAccessService.upsertAccess.mock.calls[0];
      expect(callArgs[2]).toBe(TaskAccessReason.CURRENT_ASSIGNEE);

      const expectedActions = ACCESS_REASON_ACTION_MATRIX[TaskAccessReason.CURRENT_ASSIGNEE];
      expect(callArgs[3]).toEqual(expect.arrayContaining(expectedActions));
    });
  });

  describe('revokeAssigneeAccess', () => {
    it('calls downgradeToReadOnly with expiresAt = now + configured window days', async () => {
      const windowDays = 7;
      mockConfigService.get.mockReturnValue(windowDays);
      mockTaskAccessService.downgradeToReadOnly.mockResolvedValue({});

      jest.useFakeTimers();
      const now = new Date('2024-01-15T12:00:00.000Z');
      jest.setSystemTime(now);

      await permissionService.revokeAssigneeAccess('task-1', 'user-1', 'revoker-1');

      const expectedExpiresAt = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

      expect(mockTaskAccessService.downgradeToReadOnly).toHaveBeenCalledTimes(1);
      const callArgs = mockTaskAccessService.downgradeToReadOnly.mock.calls[0];
      expect(callArgs[0]).toBe('task-1');
      expect(callArgs[1]).toBe('user-1');
      expect(callArgs[2]).toEqual(expectedExpiresAt);

      jest.useRealTimers();
    });
  });

  describe('grantTeamLeadAccess', () => {
    it('calls upsertAccess with TEAM_LEAD reason and correct actions', async () => {
      mockTaskAccessService.upsertAccess.mockResolvedValue({});

      await permissionService.grantTeamLeadAccess('task-1', 'lead-1');

      expect(mockTaskAccessService.upsertAccess).toHaveBeenCalledTimes(1);

      const callArgs = mockTaskAccessService.upsertAccess.mock.calls[0];
      expect(callArgs[2]).toBe(TaskAccessReason.TEAM_LEAD);

      const expectedActions = ACCESS_REASON_ACTION_MATRIX[TaskAccessReason.TEAM_LEAD];
      expect(callArgs[3]).toEqual(expect.arrayContaining(expectedActions));
    });
  });

  describe('revokeTeamLeadAccess', () => {
    it('calls deactivate with correct taskId and teamLeadId', async () => {
      mockTaskAccessService.deactivate.mockResolvedValue(undefined);

      await permissionService.revokeTeamLeadAccess('task-1', 'lead-1');

      expect(mockTaskAccessService.deactivate).toHaveBeenCalledWith('task-1', 'lead-1');
    });
  });

  describe('getTaskAccessors', () => {
    it('returns mapped TaskAccessRecord DTOs for all task access records', async () => {
      const rawRecords: Partial<TaskAccess>[] = [
        {
          taskId: 'task-1',
          userId: 'user-1',
          accessReason: TaskAccessReason.OWNER,
          grantedActions: Object.values(Action),
          expiresAt: null,
          isActive: true,
        },
        {
          taskId: 'task-1',
          userId: 'user-2',
          accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
          grantedActions: [Action.READ, Action.WRITE],
          expiresAt: new Date('2024-12-31'),
          isActive: true,
        },
      ];
      mockTaskAccessService.findAllForTask.mockResolvedValue(rawRecords);

      const result = await permissionService.getTaskAccessors('task-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: 'user-1',
        taskId: 'task-1',
        accessReason: TaskAccessReason.OWNER,
      });
      expect(result[1]).toMatchObject({
        userId: 'user-2',
        taskId: 'task-1',
        accessReason: TaskAccessReason.CURRENT_ASSIGNEE,
      });
    });

    it('returns empty array when no accessors exist for a task', async () => {
      mockTaskAccessService.findAllForTask.mockResolvedValue([]);

      const result = await permissionService.getTaskAccessors('task-1');

      expect(result).toEqual([]);
    });
  });
});
