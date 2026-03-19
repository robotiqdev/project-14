import { CommentService } from '../../src/services/comment.service';
import { ICommentRepository } from '../../src/repositories/comment.repository';
import { IAuditService } from '../../src/services/audit.service';
import { INotificationService } from '../../src/services/notification.service';
import { ISocketManager } from '../../src/sockets/socket.manager';
import { Comment, CreateCommentDto, UpdateCommentDto, UserRole } from '../../src/types';
import { ForbiddenError } from '../../src/errors';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c_comment_1',
  taskId: 'c_task_1',
  authorId: 'c_user_1',
  body: 'Hello world',
  parentCommentId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
  ...overrides,
});

describe('CommentService', () => {
  let commentRepo: jest.Mocked<ICommentRepository>;
  let auditService: jest.Mocked<IAuditService>;
  let notificationService: jest.Mocked<INotificationService>;
  let socketManager: jest.Mocked<ISocketManager>;
  let service: CommentService;

  beforeEach(() => {
    commentRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findThreadedByTask: jest.fn(),
      findByTask: jest.fn(),
      archiveByTaskId: jest.fn(),
      restoreByTaskId: jest.fn(),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    notificationService = {
      dispatch: jest.fn().mockResolvedValue(undefined),
      resolveRecipients: jest.fn().mockResolvedValue([]),
    };

    socketManager = {
      emitToTask: jest.fn(),
    };

    service = new CommentService(commentRepo, auditService, notificationService, socketManager);
  });

  // ─── createComment ────────────────────────────────────────────────────────

  describe('createComment', () => {
    const taskId = 'c_task_1';
    const actorId = 'c_user_1';
    const dto: CreateCommentDto = { body: 'A new comment' };

    beforeEach(() => {
      commentRepo.create.mockResolvedValue(makeComment({ body: dto.body }));
    });

    it('calls repo.create with the correct arguments', async () => {
      await service.createComment(taskId, dto, actorId);
      expect(commentRepo.create).toHaveBeenCalledTimes(1);
      expect(commentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ taskId, authorId: actorId, body: dto.body })
      );
    });

    it('calls auditService.log with action CREATED', async () => {
      await service.createComment(taskId, dto, actorId);
      expect(auditService.log).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATED', actorId })
      );
    });

    it('calls notificationService.dispatch (fire-and-forget, non-blocking)', async () => {
      await service.createComment(taskId, dto, actorId);
      // dispatch should have been called (but not necessarily awaited)
      expect(notificationService.dispatch).toHaveBeenCalledTimes(1);
    });

    it('calls socketManager.emitToTask with event comment:created', async () => {
      await service.createComment(taskId, dto, actorId);
      expect(socketManager.emitToTask).toHaveBeenCalledTimes(1);
      expect(socketManager.emitToTask).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({ event: 'comment:created' })
      );
    });

    it('returns the created comment', async () => {
      const created = makeComment({ body: dto.body });
      commentRepo.create.mockResolvedValue(created);
      const result = await service.createComment(taskId, dto, actorId);
      expect(result).toEqual(created);
    });

    it('throws ValidationError if parentCommentId belongs to a different task', async () => {
      const parentComment = makeComment({ id: 'c_parent_1', taskId: 'different_task' });
      commentRepo.findById.mockResolvedValue(parentComment);

      const dtoWithParent: CreateCommentDto = {
        body: 'Reply',
        parentCommentId: 'c_parent_1',
      };

      await expect(service.createComment(taskId, dtoWithParent, actorId)).rejects.toThrow();
    });

    it('accepts a valid parentCommentId belonging to the same task', async () => {
      const parentComment = makeComment({ id: 'c_parent_1', taskId });
      commentRepo.findById.mockResolvedValue(parentComment);
      commentRepo.create.mockResolvedValue(makeComment({ parentCommentId: 'c_parent_1' }));

      const dtoWithParent: CreateCommentDto = {
        body: 'Reply',
        parentCommentId: 'c_parent_1',
      };

      await expect(service.createComment(taskId, dtoWithParent, actorId)).resolves.toBeDefined();
    });
  });

  // ─── updateComment ────────────────────────────────────────────────────────

  describe('updateComment', () => {
    const commentId = 'c_comment_1';
    const actorId = 'c_user_1';
    const before = makeComment({ body: 'Old body' });
    const after = makeComment({ body: 'New body' });
    const dto: UpdateCommentDto = { body: 'New body' };

    beforeEach(() => {
      commentRepo.findById.mockResolvedValue(before);
      commentRepo.update.mockResolvedValue(after);
    });

    it('calls repo.findById to get the existing comment', async () => {
      await service.updateComment(commentId, dto, actorId);
      expect(commentRepo.findById).toHaveBeenCalledWith(commentId);
    });

    it('calls repo.update with the correct id and dto', async () => {
      await service.updateComment(commentId, dto, actorId);
      expect(commentRepo.update).toHaveBeenCalledWith(commentId, dto);
    });

    it('calls auditService.log with action EDITED', async () => {
      await service.updateComment(commentId, dto, actorId);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'EDITED', actorId })
      );
    });

    it('passes both before and after snapshots to auditService.log', async () => {
      await service.updateComment(commentId, dto, actorId);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          before: expect.objectContaining({ body: 'Old body' }),
          after: expect.objectContaining({ body: 'New body' }),
        })
      );
    });

    it('returns the updated comment', async () => {
      const result = await service.updateComment(commentId, dto, actorId);
      expect(result).toEqual(after);
    });
  });

  // ─── deleteComment ────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    const actorId = 'c_user_1';
    const otherId = 'c_user_2';
    const comment = makeComment({ authorId: actorId });

    beforeEach(() => {
      commentRepo.findById.mockResolvedValue(comment);
      commentRepo.softDelete.mockResolvedValue(undefined);
    });

    it('throws ForbiddenError when caller is not the author and not admin/lead', async () => {
      await expect(
        service.deleteComment(comment.id, otherId, 'MEMBER')
      ).rejects.toThrow(ForbiddenError);
    });

    it('succeeds when caller is the comment author', async () => {
      await expect(
        service.deleteComment(comment.id, actorId, 'MEMBER')
      ).resolves.toBeUndefined();
    });

    it('succeeds when caller has ADMIN role (regardless of authorship)', async () => {
      await expect(
        service.deleteComment(comment.id, otherId, 'ADMIN')
      ).resolves.toBeUndefined();
    });

    it('succeeds when caller has LEAD role (regardless of authorship)', async () => {
      await expect(
        service.deleteComment(comment.id, otherId, 'LEAD')
      ).resolves.toBeUndefined();
    });

    it('calls repo.softDelete on successful deletion', async () => {
      await service.deleteComment(comment.id, actorId, 'MEMBER');
      expect(commentRepo.softDelete).toHaveBeenCalledWith(comment.id);
    });

    it('calls auditService.log with action DELETED', async () => {
      await service.deleteComment(comment.id, actorId, 'MEMBER');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETED', actorId })
      );
    });
  });

  // ─── getThreadedComments ──────────────────────────────────────────────────

  describe('getThreadedComments', () => {
    it('delegates to repo.findThreadedByTask when threaded option is true', async () => {
      commentRepo.findThreadedByTask.mockResolvedValue([]);
      await service.getThreadedComments('c_task_1', { threaded: true });
      expect(commentRepo.findThreadedByTask).toHaveBeenCalledWith(
        'c_task_1',
        expect.objectContaining({ threaded: true })
      );
    });

    it('delegates to repo.findByTask when threaded option is false', async () => {
      commentRepo.findByTask.mockResolvedValue([]);
      await service.getThreadedComments('c_task_1', { threaded: false });
      expect(commentRepo.findByTask).toHaveBeenCalledWith(
        'c_task_1',
        expect.objectContaining({ threaded: false })
      );
    });
  });

  // ─── archiveTaskComments / restoreTaskComments ────────────────────────────

  describe('archiveTaskComments', () => {
    it('calls repo.archiveByTaskId and auditService.log with action ARCHIVED', async () => {
      commentRepo.archiveByTaskId.mockResolvedValue(undefined);
      await service.archiveTaskComments('c_task_1', 'c_user_1');
      expect(commentRepo.archiveByTaskId).toHaveBeenCalledWith('c_task_1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ARCHIVED', actorId: 'c_user_1' })
      );
    });
  });

  describe('restoreTaskComments', () => {
    it('calls repo.restoreByTaskId and auditService.log with action RESTORED', async () => {
      commentRepo.restoreByTaskId.mockResolvedValue(undefined);
      await service.restoreTaskComments('c_task_1', 'c_user_1');
      expect(commentRepo.restoreByTaskId).toHaveBeenCalledWith('c_task_1');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTORED', actorId: 'c_user_1' })
      );
    });
  });
});
