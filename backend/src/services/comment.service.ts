import { ICommentRepository } from '../repositories/comment.repository';
import { IAuditService } from './audit.service';
import { INotificationService } from './notification.service';
import { ISocketManager } from '../sockets/socket.manager';
import {
  Comment,
  CreateCommentDto,
  GetThreadedCommentsOpts,
  UpdateCommentDto,
  UserRole,
} from '../types';
import { ForbiddenError, ValidationError } from '../errors';

export class CommentService {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    private readonly socketManager: ISocketManager
  ) {}

  async createComment(
    taskId: string,
    dto: CreateCommentDto,
    actorId: string
  ): Promise<Comment> {
    if (dto.parentCommentId) {
      const parent = await this.commentRepo.findById(dto.parentCommentId);
      if (!parent || parent.taskId !== taskId) {
        throw new ValidationError('parentCommentId must belong to the same task');
      }
    }

    const comment = await this.commentRepo.create({
      taskId,
      authorId: actorId,
      body: dto.body,
      parentCommentId: dto.parentCommentId,
    });

    await this.auditService.log({
      action: 'CREATED',
      actorId,
      resourceType: 'comment',
      resourceId: comment.id,
    });

    void this.notificationService.dispatch({
      taskId,
      actorId,
      body: dto.body,
      recipients: [],
      commentId: comment.id,
    });

    this.socketManager.emitToTask(taskId, {
      event: 'comment:created',
      data: comment,
    });

    return comment;
  }

  async updateComment(
    id: string,
    dto: UpdateCommentDto,
    actorId: string
  ): Promise<Comment> {
    const before = await this.commentRepo.findById(id);
    const after = await this.commentRepo.update(id, dto);

    await this.auditService.log({
      action: 'EDITED',
      actorId,
      resourceType: 'comment',
      resourceId: id,
      before,
      after,
    });

    this.socketManager.emitToTask(after.taskId, {
      event: 'comment:updated',
      data: after,
    });

    return after;
  }

  async deleteComment(
    id: string,
    actorId: string,
    role: UserRole
  ): Promise<void> {
    const comment = await this.commentRepo.findById(id);

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== actorId && role !== 'ADMIN' && role !== 'LEAD') {
      throw new ForbiddenError();
    }

    await this.commentRepo.softDelete(id);

    await this.auditService.log({
      action: 'DELETED',
      actorId,
      resourceType: 'comment',
      resourceId: id,
    });

    this.socketManager.emitToTask(comment.taskId, {
      event: 'comment:deleted',
      data: { id },
    });
  }

  async getThreadedComments(
    taskId: string,
    opts?: GetThreadedCommentsOpts
  ): Promise<Comment[]> {
    if (opts?.threaded) {
      return this.commentRepo.findThreadedByTask(taskId, opts);
    }
    return this.commentRepo.findByTask(taskId, opts);
  }

  async archiveTaskComments(taskId: string, actorId: string): Promise<void> {
    await this.commentRepo.archiveByTaskId(taskId);
    await this.auditService.log({
      action: 'ARCHIVED',
      actorId,
      resourceType: 'comment',
      resourceId: taskId,
    });
  }

  async restoreTaskComments(taskId: string, actorId: string): Promise<void> {
    await this.commentRepo.restoreByTaskId(taskId);
    await this.auditService.log({
      action: 'RESTORED',
      actorId,
      resourceType: 'comment',
      resourceId: taskId,
    });
  }
}
