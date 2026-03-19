import { Comment, CreateCommentDto, GetThreadedCommentsOpts, UpdateCommentDto } from '../types';

export interface ICommentRepository {
  create(dto: CreateCommentDto & { taskId: string; authorId: string }): Promise<Comment>;
  findById(id: string): Promise<Comment | null>;
  update(id: string, dto: UpdateCommentDto): Promise<Comment>;
  softDelete(id: string): Promise<void>;
  findThreadedByTask(taskId: string, opts?: GetThreadedCommentsOpts): Promise<Comment[]>;
  findByTask(taskId: string, opts?: GetThreadedCommentsOpts): Promise<Comment[]>;
  archiveByTaskId(taskId: string): Promise<void>;
  restoreByTaskId(taskId: string): Promise<void>;
}
