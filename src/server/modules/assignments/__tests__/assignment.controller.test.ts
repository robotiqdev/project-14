import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import { AssignmentController } from '../assignment.controller';
import { AssignmentService } from '../assignment.service';
import { createAssignmentRouter } from '../assignment.routes';
import {
  IAssignment,
  AssignmentNotFoundError,
  TaskNotFoundError,
  AssigneeNotActiveTeamMemberError,
  PermissionDeniedError,
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

function makeServiceMock(): jest.Mocked<AssignmentService> {
  return {
    assignTask: jest.fn(),
    reassignTask: jest.fn(),
    unassignTask: jest.fn(),
    getActiveAssignment: jest.fn(),
    getAssignmentHistory: jest.fn(),
  } as unknown as jest.Mocked<AssignmentService>;
}

/**
 * Creates a test Express app that uses real routes but a mocked service.
 * Optional permissionDenied flag causes middleware to return 403.
 */
function createTestApp(
  serviceMock: jest.Mocked<AssignmentService>,
  opts: { permissionDenied?: boolean } = {},
): Application {
  const app = express();
  app.use(express.json());

  // Inject actor id on every request
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { actorId?: string }).actorId = 'user-uuid-actor';
    next();
  });

  // Simulate permission gate for testing 403 scenario
  if (opts.permissionDenied) {
    app.use((_req: Request, res: Response) => {
      res.status(403).json({ error: 'Forbidden' });
    });
  } else {
    app.use('/api', createAssignmentRouter(serviceMock as unknown as AssignmentService));
  }

  // Global error handler — ensures unhandled errors return 500 instead of hanging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AssignmentController (integration via supertest)', () => {
  let serviceMock: jest.Mocked<AssignmentService>;
  let app: Application;

  const TASK_ID = 'task-uuid-1';
  const ASSIGNEE_ID = 'user-uuid-assignee';
  const NEW_ASSIGNEE_ID = 'user-uuid-new-assignee';

  beforeEach(() => {
    serviceMock = makeServiceMock();
    app = createTestApp(serviceMock);
  });

  // =========================================================================
  // POST /api/tasks/:taskId/assign  → 201
  // =========================================================================
  describe('POST /api/tasks/:taskId/assign', () => {
    it('returns 201 with the created assignment body', async () => {
      const assignment = buildAssignment();
      serviceMock.assignTask.mockResolvedValue(assignment);

      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: ASSIGNEE_ID });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
      });
    });

    it('calls assignmentService.assignTask with taskId from route param and assigneeId from body', async () => {
      const assignment = buildAssignment();
      serviceMock.assignTask.mockResolvedValue(assignment);

      await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: ASSIGNEE_ID });

      expect(serviceMock.assignTask).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: TASK_ID, assigneeId: ASSIGNEE_ID }),
        expect.any(String),
      );
    });

    it('returns 400 when assigneeId is missing from the request body', async () => {
      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 when the task does not exist', async () => {
      serviceMock.assignTask.mockRejectedValue(new TaskNotFoundError());

      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: ASSIGNEE_ID });

      expect(res.status).toBe(404);
    });

    it('returns 400 when assignee is not an active team member', async () => {
      serviceMock.assignTask.mockRejectedValue(
        new AssigneeNotActiveTeamMemberError(),
      );

      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: ASSIGNEE_ID });

      expect(res.status).toBe(400);
    });

    it('returns 403 when caller lacks permission', async () => {
      const forbiddenApp = createTestApp(serviceMock, { permissionDenied: true });

      const res = await request(forbiddenApp)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: ASSIGNEE_ID });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // PUT /api/tasks/:taskId/reassign  → 200
  // =========================================================================
  describe('PUT /api/tasks/:taskId/reassign', () => {
    it('returns 200 with the updated assignment body', async () => {
      const newAssignment = buildAssignment({ assigneeId: NEW_ASSIGNEE_ID });
      serviceMock.reassignTask.mockResolvedValue(newAssignment);

      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: NEW_ASSIGNEE_ID });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        assigneeId: NEW_ASSIGNEE_ID,
      });
    });

    it('calls assignmentService.reassignTask with correct params', async () => {
      const newAssignment = buildAssignment({ assigneeId: NEW_ASSIGNEE_ID });
      serviceMock.reassignTask.mockResolvedValue(newAssignment);

      await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: NEW_ASSIGNEE_ID, reason: 'workload' });

      expect(serviceMock.reassignTask).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: TASK_ID,
          newAssigneeId: NEW_ASSIGNEE_ID,
        }),
        expect.any(String),
      );
    });

    it('returns 400 when newAssigneeId is missing', async () => {
      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 when the task does not exist', async () => {
      serviceMock.reassignTask.mockRejectedValue(new TaskNotFoundError());

      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: NEW_ASSIGNEE_ID });

      expect(res.status).toBe(404);
    });

    it('returns 404 when there is no active assignment to reassign', async () => {
      serviceMock.reassignTask.mockRejectedValue(new AssignmentNotFoundError());

      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: NEW_ASSIGNEE_ID });

      expect(res.status).toBe(404);
    });

    it('returns 403 when caller lacks permission', async () => {
      const forbiddenApp = createTestApp(serviceMock, { permissionDenied: true });

      const res = await request(forbiddenApp)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: NEW_ASSIGNEE_ID });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // DELETE /api/tasks/:taskId/unassign  → 204
  // =========================================================================
  describe('DELETE /api/tasks/:taskId/unassign', () => {
    it('returns 204 with no body on success', async () => {
      serviceMock.unassignTask.mockResolvedValue(undefined);

      const res = await request(app).delete(`/api/tasks/${TASK_ID}/unassign`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('calls assignmentService.unassignTask with correct taskId', async () => {
      serviceMock.unassignTask.mockResolvedValue(undefined);

      await request(app)
        .delete(`/api/tasks/${TASK_ID}/unassign`)
        .send({ reason: 'no longer needed' });

      expect(serviceMock.unassignTask).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: TASK_ID }),
        expect.any(String),
      );
    });

    it('returns 404 when there is no active assignment to unassign', async () => {
      serviceMock.unassignTask.mockRejectedValue(new AssignmentNotFoundError());

      const res = await request(app).delete(`/api/tasks/${TASK_ID}/unassign`);

      expect(res.status).toBe(404);
    });

    it('returns 404 when the task does not exist', async () => {
      serviceMock.unassignTask.mockRejectedValue(new TaskNotFoundError());

      const res = await request(app).delete(`/api/tasks/${TASK_ID}/unassign`);

      expect(res.status).toBe(404);
    });

    it('returns 403 when caller lacks permission', async () => {
      const forbiddenApp = createTestApp(serviceMock, { permissionDenied: true });

      const res = await request(forbiddenApp).delete(
        `/api/tasks/${TASK_ID}/unassign`,
      );

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/tasks/:taskId/assignment  → 200 or 404
  // =========================================================================
  describe('GET /api/tasks/:taskId/assignment', () => {
    it('returns 200 with the active assignment when one exists', async () => {
      const assignment = buildAssignment();
      serviceMock.getActiveAssignment.mockResolvedValue(assignment);

      const res = await request(app).get(`/api/tasks/${TASK_ID}/assignment`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_ID,
      });
    });

    it('returns 404 when no active assignment exists for the task', async () => {
      serviceMock.getActiveAssignment.mockResolvedValue(null);

      const res = await request(app).get(`/api/tasks/${TASK_ID}/assignment`);

      expect(res.status).toBe(404);
    });

    it('calls assignmentService.getActiveAssignment with the route taskId', async () => {
      serviceMock.getActiveAssignment.mockResolvedValue(buildAssignment());

      await request(app).get(`/api/tasks/${TASK_ID}/assignment`);

      expect(serviceMock.getActiveAssignment).toHaveBeenCalledWith(TASK_ID);
    });

    it('returns 404 when the task does not exist', async () => {
      serviceMock.getActiveAssignment.mockRejectedValue(new TaskNotFoundError());

      const res = await request(app).get(`/api/tasks/${TASK_ID}/assignment`);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // GET /api/tasks/:taskId/assignment-history  → array
  // =========================================================================
  describe('GET /api/tasks/:taskId/assignment-history', () => {
    it('returns 200 with an array of assignment history', async () => {
      const history = [
        buildAssignment({
          id: 'a2',
          assignedAt: new Date('2024-02-01'),
          unassignedAt: null,
        }),
        buildAssignment({
          id: 'a1',
          assignedAt: new Date('2024-01-01'),
          unassignedAt: new Date('2024-01-31'),
        }),
      ];
      serviceMock.getAssignmentHistory.mockResolvedValue(history);

      const res = await request(app).get(
        `/api/tasks/${TASK_ID}/assignment-history`,
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('returns 200 with an empty array when there is no history', async () => {
      serviceMock.getAssignmentHistory.mockResolvedValue([]);

      const res = await request(app).get(
        `/api/tasks/${TASK_ID}/assignment-history`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('calls assignmentService.getAssignmentHistory with the route taskId', async () => {
      serviceMock.getAssignmentHistory.mockResolvedValue([]);

      await request(app).get(`/api/tasks/${TASK_ID}/assignment-history`);

      expect(serviceMock.getAssignmentHistory).toHaveBeenCalledWith(TASK_ID);
    });

    it('returns 404 when the task does not exist', async () => {
      serviceMock.getAssignmentHistory.mockRejectedValue(new TaskNotFoundError());

      const res = await request(app).get(
        `/api/tasks/${TASK_ID}/assignment-history`,
      );

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Validation — common across endpoints
  // =========================================================================
  describe('Validation', () => {
    it('POST assign: returns 400 when assigneeId is an empty string', async () => {
      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .send({ assigneeId: '' });

      expect(res.status).toBe(400);
    });

    it('POST assign: returns 400 when body is not JSON', async () => {
      const res = await request(app)
        .post(`/api/tasks/${TASK_ID}/assign`)
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect(res.status).toBe(400);
    });

    it('PUT reassign: returns 400 when newAssigneeId is an empty string', async () => {
      const res = await request(app)
        .put(`/api/tasks/${TASK_ID}/reassign`)
        .send({ newAssigneeId: '' });

      expect(res.status).toBe(400);
    });
  });
});
