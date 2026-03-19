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

export class CommentService {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly auditService: IAuditService,
    private readonly notificationService: INotificationService,
    private readonly socketManager: ISocketManager
  ) {}

  async createComment(
    _taskId: string,
    _dto: CreateCommentDto,
    _actorId: string
  ): Promise<Comment> {
    throw new Error('Not implemented');
  }

  async updateComment(
    _id: string,
    _dto: UpdateCommentDto,
    _actorId: string
  ): Promise<Comment> {
    throw new Error('Not implemented');
  }

  async deleteComment(
    _id: string,
    _actorId: string,
    _role: UserRole
  ): Promise<void> {
    throw new Error('Not implemented');
  }

  async getThreadedComments(
    _taskId: string,
    _opts?: GetThreadedCommentsOpts
  ): Promise<Comment[]> {
    throw new Error('Not implemented');
  }

  async archiveTaskComments(_taskId: string, _actorId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async restoreTaskComments(_taskId: string, _actorId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
