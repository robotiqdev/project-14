import { AssignmentRepository } from '../assignment.repository';
import { IAssignment } from '../../../shared/types/assignment.types';

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------
function makePrismaMock() {
  return {
    taskAssignment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildAssignment(overrides: Partial<IAssignment> = {}): IAssignment {
  return {
    id: 'assignment-uuid-1',
    taskId: 'task-uuid-1',
    assigneeId: 'user-uuid-1',
    assignedById: 'user-uuid-2',
    assignedAt: new Date('2024-01-01T10:00:00Z'),
    unassignedAt: null,
    unassignReason: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AssignmentRepository', () => {
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let repository: AssignmentRepository;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    repository = new AssignmentRepository(prismaMock);
  });

  // -------------------------------------------------------------------------
  // createAssignment
  // -------------------------------------------------------------------------
  describe('createAssignment', () => {
    it('inserts a record with the correct taskId', async () => {
      const record = buildAssignment();
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      await repository.createAssignment({
        taskId: 'task-uuid-1',
        assigneeId: 'user-uuid-1',
        assignedById: 'user-uuid-2',
      });

      expect(prismaMock.taskAssignment.create).toHaveBeenCalledTimes(1);
      const callArg = prismaMock.taskAssignment.create.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ taskId: 'task-uuid-1' });
    });

    it('inserts a record with the correct assigneeId', async () => {
      const record = buildAssignment();
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      await repository.createAssignment({
        taskId: 'task-uuid-1',
        assigneeId: 'user-uuid-1',
        assignedById: 'user-uuid-2',
      });

      const callArg = prismaMock.taskAssignment.create.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ assigneeId: 'user-uuid-1' });
    });

    it('inserts a record with the correct assignedById', async () => {
      const record = buildAssignment();
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      await repository.createAssignment({
        taskId: 'task-uuid-1',
        assigneeId: 'user-uuid-1',
        assignedById: 'user-uuid-2',
      });

      const callArg = prismaMock.taskAssignment.create.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ assignedById: 'user-uuid-2' });
    });

    it('uses a provided assignedAt timestamp when supplied', async () => {
      const assignedAt = new Date('2024-06-15T09:30:00Z');
      const record = buildAssignment({ assignedAt });
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      await repository.createAssignment({
        taskId: 'task-uuid-1',
        assigneeId: 'user-uuid-1',
        assignedById: 'user-uuid-2',
        assignedAt,
      });

      const callArg = prismaMock.taskAssignment.create.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ assignedAt });
    });

    it('returns the created assignment record', async () => {
      const record = buildAssignment();
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      const result = await repository.createAssignment({
        taskId: record.taskId,
        assigneeId: record.assigneeId,
        assignedById: record.assignedById,
      });

      expect(result.id).toBe(record.id);
      expect(result.taskId).toBe(record.taskId);
      expect(result.assigneeId).toBe(record.assigneeId);
      expect(result.assignedById).toBe(record.assignedById);
    });

    it('returns a record with unassignedAt set to null by default', async () => {
      const record = buildAssignment({ unassignedAt: null });
      prismaMock.taskAssignment.create.mockResolvedValue(record);

      const result = await repository.createAssignment({
        taskId: record.taskId,
        assigneeId: record.assigneeId,
        assignedById: record.assignedById,
      });

      expect(result.unassignedAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getActiveAssignmentByTask
  // -------------------------------------------------------------------------
  describe('getActiveAssignmentByTask', () => {
    it('queries with the provided taskId', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await repository.getActiveAssignmentByTask('task-uuid-1');

      expect(prismaMock.taskAssignment.findFirst).toHaveBeenCalledTimes(1);
      const callArg = prismaMock.taskAssignment.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ taskId: 'task-uuid-1' });
    });

    it('filters for records where unassignedAt is null (active only)', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await repository.getActiveAssignmentByTask('task-uuid-1');

      const callArg = prismaMock.taskAssignment.findFirst.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ unassignedAt: null });
    });

    it('returns the most recent active assignment', async () => {
      const active = buildAssignment({ id: 'latest-assignment' });
      prismaMock.taskAssignment.findFirst.mockResolvedValue(active);

      const result = await repository.getActiveAssignmentByTask('task-uuid-1');

      expect(result).toEqual(active);
      expect(result?.id).toBe('latest-assignment');
    });

    it('returns null when no active assignment exists for the task', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      const result = await repository.getActiveAssignmentByTask('task-uuid-99');

      expect(result).toBeNull();
    });

    it('orders results to get the most recent (ordered by assignedAt desc)', async () => {
      prismaMock.taskAssignment.findFirst.mockResolvedValue(null);

      await repository.getActiveAssignmentByTask('task-uuid-1');

      const callArg = prismaMock.taskAssignment.findFirst.mock.calls[0][0];
      // Should order to reliably return "most recent"
      expect(callArg.orderBy).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // listAssignmentHistory
  // -------------------------------------------------------------------------
  describe('listAssignmentHistory', () => {
    it('queries all records for the given taskId', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      await repository.listAssignmentHistory('task-uuid-1');

      expect(prismaMock.taskAssignment.findMany).toHaveBeenCalledTimes(1);
      const callArg = prismaMock.taskAssignment.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ taskId: 'task-uuid-1' });
    });

    it('orders results descending by assignedAt', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      await repository.listAssignmentHistory('task-uuid-1');

      const callArg = prismaMock.taskAssignment.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toMatchObject({ assignedAt: 'desc' });
    });

    it('returns all assignment records including unassigned ones', async () => {
      const records = [
        buildAssignment({
          id: 'a2',
          assignedAt: new Date('2024-02-01'),
          unassignedAt: null,
        }),
        buildAssignment({
          id: 'a1',
          assignedAt: new Date('2024-01-01'),
          unassignedAt: new Date('2024-01-31'),
          unassignReason: 'reassigned',
        }),
      ];
      prismaMock.taskAssignment.findMany.mockResolvedValue(records);

      const result = await repository.listAssignmentHistory('task-uuid-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a2');
      expect(result[1].id).toBe('a1');
    });

    it('returns an empty array when no history exists', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      const result = await repository.listAssignmentHistory('task-uuid-no-history');

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // markUnassigned
  // -------------------------------------------------------------------------
  describe('markUnassigned', () => {
    it('updates the record with the provided unassignedAt timestamp', async () => {
      const unassignedAt = new Date('2024-03-10T12:00:00Z');
      const updated = buildAssignment({ unassignedAt });
      prismaMock.taskAssignment.update.mockResolvedValue(updated);

      await repository.markUnassigned('assignment-uuid-1', unassignedAt);

      expect(prismaMock.taskAssignment.update).toHaveBeenCalledTimes(1);
      const callArg = prismaMock.taskAssignment.update.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ unassignedAt });
    });

    it('targets the record by the provided id', async () => {
      const updated = buildAssignment({ unassignedAt: new Date() });
      prismaMock.taskAssignment.update.mockResolvedValue(updated);

      await repository.markUnassigned('assignment-uuid-1', new Date());

      const callArg = prismaMock.taskAssignment.update.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ id: 'assignment-uuid-1' });
    });

    it('stores the unassign reason when provided', async () => {
      const unassignedAt = new Date();
      const reason = 'reassigned';
      const updated = buildAssignment({ unassignedAt, unassignReason: reason });
      prismaMock.taskAssignment.update.mockResolvedValue(updated);

      await repository.markUnassigned('assignment-uuid-1', unassignedAt, reason);

      const callArg = prismaMock.taskAssignment.update.mock.calls[0][0];
      expect(callArg.data).toMatchObject({ unassignReason: reason });
    });

    it('returns the updated assignment record', async () => {
      const unassignedAt = new Date();
      const updated = buildAssignment({ unassignedAt });
      prismaMock.taskAssignment.update.mockResolvedValue(updated);

      const result = await repository.markUnassigned('assignment-uuid-1', unassignedAt);

      expect(result.unassignedAt).toEqual(unassignedAt);
    });
  });

  // -------------------------------------------------------------------------
  // getAssignmentsByAssignee
  // -------------------------------------------------------------------------
  describe('getAssignmentsByAssignee', () => {
    it('queries by assigneeId', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      await repository.getAssignmentsByAssignee('user-uuid-1', false);

      const callArg = prismaMock.taskAssignment.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ assigneeId: 'user-uuid-1' });
    });

    it('filters for active assignments only when onlyActive is true', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      await repository.getAssignmentsByAssignee('user-uuid-1', true);

      const callArg = prismaMock.taskAssignment.findMany.mock.calls[0][0];
      expect(callArg.where).toMatchObject({ unassignedAt: null });
    });

    it('returns all assignments (including closed) when onlyActive is false', async () => {
      const records = [
        buildAssignment({ unassignedAt: null }),
        buildAssignment({ id: 'a2', unassignedAt: new Date() }),
      ];
      prismaMock.taskAssignment.findMany.mockResolvedValue(records);

      const result = await repository.getAssignmentsByAssignee('user-uuid-1', false);

      expect(result).toHaveLength(2);
      // Should NOT apply unassignedAt: null filter
      const callArg = prismaMock.taskAssignment.findMany.mock.calls[0][0];
      expect(callArg.where?.unassignedAt).toBeUndefined();
    });

    it('returns empty array when assignee has no assignments', async () => {
      prismaMock.taskAssignment.findMany.mockResolvedValue([]);

      const result = await repository.getAssignmentsByAssignee('user-uuid-99', false);

      expect(result).toEqual([]);
    });
  });
});
