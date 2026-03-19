import { AssignmentService } from '../assignment.service';
import { AssignmentRepository } from '../assignment.repository';
import {
  IAssignment,
  IAuditService,
  INotificationService,
  IAssignTaskDTO,
  IReassignTaskDTO,
  IUnassignTaskDTO,
  AssigneeNotActiveTeamMemberError,
  TaskNotFoundError,
  AssignmentNotFoundError,
} from '../../../shared/types/assignment.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildAssignment(overrides: Partial<IAssignment> = {}): IAssignment {
  return {
    id: 'assignment-uuid-1',
    taskId: 'task-uuid-1',
    assigneeId: 'user-uuid-assignee',
    assignedById: 'user-uuid-actor',
    assignedAt: new Date('2024-01-01T10:00:00Z'),
    unassignedAt: null,
    unassignReason: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

function makeRepositoryMock(): jest.Mocked<AssignmentRepository> {
  return {
    createAssignment: jest.fn(),
    markUnassigned: jest.fn(),
    getActiveAssignmentByTask: jest.fn(),
    listAssignmentHistory: jest.fn(),
    getAssignmentsByAssignee: jest.fn(),
  } as unknown as jest.Mocked<AssignmentRepository>;
}

function makeAuditMock(): jest.Mocked<IAuditService> {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeNotificationMock(): jest.Mocked<INotificationService> {
  return {
    notifyAssigned: jest.fn().mockResolvedValue(undefined),
    notifyReassigned: jest.fn().mockResolvedValue(undefined),
    notifyUnassigned: jest.fn().mockResolvedValue(undefined),
  };
}

// Prisma mock: task and user lookups
function makePrismaMock(
  opts: { taskExists?: boolean; assigneeIsActiveMember?: boolean } = {},
) {
  const { taskExists = true, assigneeIsActiveMember = true } = opts;
  return {
    task: {
      findUnique: jest.fn().mockResolvedValue(
        taskExists ? { id: 'task-uuid-1', teamId: 'team-uuid-1' } : null,
      ),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(
        assigneeIsActiveMember
          ? { id: 'user-uuid-assignee', isActive: true, teamId: 'team-uuid-1' }
          : null,
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AssignmentService', () => {
  let repositoryMock: jest.Mocked<AssignmentRepository>;
  let auditMock: jest.Mocked<IAuditService>;
  let notificationMock: jest.Mocked<INotificationService>;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let service: AssignmentService;

  const ACTOR_ID = 'user-uuid-actor';

  beforeEach(() => {
    repositoryMock = makeRepositoryMock();
    auditMock = makeAuditMock();
    notificationMock = makeNotificationMock();
    prismaMock = makePrismaMock();
    service = new AssignmentService(
      repositoryMock,
      auditMock,
      notificationMock,
      prismaMock,
    );
  });

  // =========================================================================
  // assignTask
  // =========================================================================
  describe('assignTask', () => {
    const dto: IAssignTaskDTO = {
      taskId: 'task-uuid-1',
      assigneeId: 'user-uuid-assignee',
    };

    it('throws TaskNotFoundError when the task does not exist', async () => {
      prismaMock = makePrismaMock({ taskExists: false });
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.assignTask(dto, ACTOR_ID)).rejects.toThrow(
        TaskNotFoundError,
      );
    });

    it('throws AssigneeNotActiveTeamMemberError when assignee is not an active team member', async () => {
      prismaMock = makePrismaMock({ assigneeIsActiveMember: false });
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.assignTask(dto, ACTOR_ID)).rejects.toThrow(
        AssigneeNotActiveTeamMemberError,
      );
    });

    it('does not create an assignment record when the assignee is not an active member', async () => {
      prismaMock = makePrismaMock({ assigneeIsActiveMember: false });
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.assignTask(dto, ACTOR_ID)).rejects.toThrow();
      expect(repositoryMock.createAssignment).not.toHaveBeenCalled();
    });

    it('creates an assignment record with correct taskId and assigneeId', async () => {
      const created = buildAssignment();
      repositoryMock.createAssignment.mockResolvedValue(created);

      await service.assignTask(dto, ACTOR_ID);

      expect(repositoryMock.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: dto.taskId,
          assigneeId: dto.assigneeId,
        }),
      );
    });

    it('creates an assignment record with the actorId as assignedById', async () => {
      const created = buildAssignment();
      repositoryMock.createAssignment.mockResolvedValue(created);

      await service.assignTask(dto, ACTOR_ID);

      expect(repositoryMock.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ assignedById: ACTOR_ID }),
      );
    });

    it('emits a "task.assigned" audit event after creating the assignment', async () => {
      const created = buildAssignment();
      repositoryMock.createAssignment.mockResolvedValue(created);

      await service.assignTask(dto, ACTOR_ID);

      expect(auditMock.log).toHaveBeenCalledWith(
        'task.assigned',
        expect.objectContaining({
          taskId: dto.taskId,
          assigneeId: dto.assigneeId,
        }),
      );
    });

    it('triggers an assignment notification after creating the record', async () => {
      const created = buildAssignment();
      repositoryMock.createAssignment.mockResolvedValue(created);

      await service.assignTask(dto, ACTOR_ID);

      expect(notificationMock.notifyAssigned).toHaveBeenCalledWith(
        dto.assigneeId,
        dto.taskId,
        ACTOR_ID,
      );
    });

    it('returns the newly created assignment', async () => {
      const created = buildAssignment();
      repositoryMock.createAssignment.mockResolvedValue(created);

      const result = await service.assignTask(dto, ACTOR_ID);

      expect(result).toEqual(created);
    });

    it('does not emit an audit event when task validation fails', async () => {
      prismaMock = makePrismaMock({ taskExists: false });
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.assignTask(dto, ACTOR_ID)).rejects.toThrow();
      expect(auditMock.log).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // reassignTask
  // =========================================================================
  describe('reassignTask', () => {
    const dto: IReassignTaskDTO = {
      taskId: 'task-uuid-1',
      newAssigneeId: 'user-uuid-new-assignee',
      reason: 'workload rebalancing',
    };

    const existingAssignment = buildAssignment({
      assigneeId: 'user-uuid-old-assignee',
    });

    beforeEach(() => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(existingAssignment);
      repositoryMock.markUnassigned.mockResolvedValue({
        ...existingAssignment,
        unassignedAt: new Date(),
        unassignReason: 'reassigned',
      });
      repositoryMock.createAssignment.mockResolvedValue(
        buildAssignment({ assigneeId: dto.newAssigneeId }),
      );
      // New assignee is active member
      prismaMock.user.findUnique.mockResolvedValue({
        id: dto.newAssigneeId,
        isActive: true,
        teamId: 'team-uuid-1',
      });
    });

    it('throws AssignmentNotFoundError when there is no active assignment to reassign', async () => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(null);

      await expect(service.reassignTask(dto, ACTOR_ID)).rejects.toThrow(
        AssignmentNotFoundError,
      );
    });

    it('marks the previous assignment as unassigned with reason "reassigned"', async () => {
      await service.reassignTask(dto, ACTOR_ID);

      expect(repositoryMock.markUnassigned).toHaveBeenCalledWith(
        existingAssignment.id,
        expect.any(Date),
        'reassigned',
      );
    });

    it('creates a new assignment for the new assignee', async () => {
      await service.reassignTask(dto, ACTOR_ID);

      expect(repositoryMock.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: dto.taskId,
          assigneeId: dto.newAssigneeId,
        }),
      );
    });

    it('validates the new assignee is an active team member', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.reassignTask(dto, ACTOR_ID)).rejects.toThrow(
        AssigneeNotActiveTeamMemberError,
      );
    });

    it('emits a "task.reassigned" audit event including old and new assignee info', async () => {
      await service.reassignTask(dto, ACTOR_ID);

      expect(auditMock.log).toHaveBeenCalledWith(
        'task.reassigned',
        expect.objectContaining({
          taskId: dto.taskId,
          oldAssigneeId: existingAssignment.assigneeId,
          newAssigneeId: dto.newAssigneeId,
        }),
      );
    });

    it('triggers a reassignment notification', async () => {
      await service.reassignTask(dto, ACTOR_ID);

      expect(notificationMock.notifyReassigned).toHaveBeenCalledWith(
        existingAssignment.assigneeId,
        dto.newAssigneeId,
        dto.taskId,
        ACTOR_ID,
      );
    });

    it('returns the new assignment record', async () => {
      const newAssignment = buildAssignment({ assigneeId: dto.newAssigneeId });
      repositoryMock.createAssignment.mockResolvedValue(newAssignment);

      const result = await service.reassignTask(dto, ACTOR_ID);

      expect(result.assigneeId).toBe(dto.newAssigneeId);
    });

    it('does not unassign the previous record if new assignee validation fails', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      service = new AssignmentService(
        repositoryMock,
        auditMock,
        notificationMock,
        prismaMock,
      );

      await expect(service.reassignTask(dto, ACTOR_ID)).rejects.toThrow();
      expect(repositoryMock.markUnassigned).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // unassignTask
  // =========================================================================
  describe('unassignTask', () => {
    const dto: IUnassignTaskDTO = {
      taskId: 'task-uuid-1',
      reason: 'no longer needed',
    };

    const activeAssignment = buildAssignment();

    beforeEach(() => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(activeAssignment);
      repositoryMock.markUnassigned.mockResolvedValue({
        ...activeAssignment,
        unassignedAt: new Date(),
        unassignReason: dto.reason ?? null,
      });
    });

    it('throws AssignmentNotFoundError when there is no active assignment', async () => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(null);

      await expect(service.unassignTask(dto, ACTOR_ID)).rejects.toThrow(
        AssignmentNotFoundError,
      );
    });

    it('sets unassignedAt on the active assignment record', async () => {
      await service.unassignTask(dto, ACTOR_ID);

      expect(repositoryMock.markUnassigned).toHaveBeenCalledWith(
        activeAssignment.id,
        expect.any(Date),
        expect.anything(),
      );
    });

    it('passes the provided reason when unassigning', async () => {
      await service.unassignTask(dto, ACTOR_ID);

      expect(repositoryMock.markUnassigned).toHaveBeenCalledWith(
        activeAssignment.id,
        expect.any(Date),
        dto.reason,
      );
    });

    it('emits a "task.unassigned" audit event', async () => {
      await service.unassignTask(dto, ACTOR_ID);

      expect(auditMock.log).toHaveBeenCalledWith(
        'task.unassigned',
        expect.objectContaining({
          taskId: dto.taskId,
          assigneeId: activeAssignment.assigneeId,
        }),
      );
    });

    it('triggers an unassignment notification', async () => {
      await service.unassignTask(dto, ACTOR_ID);

      expect(notificationMock.notifyUnassigned).toHaveBeenCalledWith(
        activeAssignment.assigneeId,
        dto.taskId,
        ACTOR_ID,
      );
    });

    it('does not emit an audit event when there is no active assignment', async () => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(null);

      await expect(service.unassignTask(dto, ACTOR_ID)).rejects.toThrow();
      expect(auditMock.log).not.toHaveBeenCalled();
    });

    it('resolves without returning a value (void)', async () => {
      const result = await service.unassignTask(dto, ACTOR_ID).catch(() => 'threw');
      // Should not throw with valid setup
      expect(result).toBeUndefined();
    });
  });

  // =========================================================================
  // getActiveAssignment
  // =========================================================================
  describe('getActiveAssignment', () => {
    it('delegates to repository.getActiveAssignmentByTask', async () => {
      const assignment = buildAssignment();
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(assignment);

      const result = await service.getActiveAssignment('task-uuid-1');

      expect(repositoryMock.getActiveAssignmentByTask).toHaveBeenCalledWith(
        'task-uuid-1',
      );
      expect(result).toEqual(assignment);
    });

    it('returns null when there is no active assignment', async () => {
      repositoryMock.getActiveAssignmentByTask.mockResolvedValue(null);

      const result = await service.getActiveAssignment('task-uuid-99');

      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // getAssignmentHistory
  // =========================================================================
  describe('getAssignmentHistory', () => {
    it('delegates to repository.listAssignmentHistory', async () => {
      const history = [buildAssignment()];
      repositoryMock.listAssignmentHistory.mockResolvedValue(history);

      const result = await service.getAssignmentHistory('task-uuid-1');

      expect(repositoryMock.listAssignmentHistory).toHaveBeenCalledWith('task-uuid-1');
      expect(result).toEqual(history);
    });

    it('returns an empty array when there is no history', async () => {
      repositoryMock.listAssignmentHistory.mockResolvedValue([]);

      const result = await service.getAssignmentHistory('task-uuid-1');

      expect(result).toEqual([]);
    });
  });
});
