import { Request, Response, NextFunction } from 'express';
import { ICommentRepository } from '../repositories/comment.repository';
import { Comment } from '../types';

export interface CommentAccessRequest extends Request {
  comment?: Comment;
}

export function createCommentAccessMiddleware(commentRepo: ICommentRepository) {
  return async (req: CommentAccessRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comment = await commentRepo.findById(req.params.id);
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }
      if ((req as any).task?.isArchived) {
        res.status(403).json({ error: 'TASK_ARCHIVED' });
        return;
      }
      req.comment = comment;
      next();
    } catch (err) {
      next(err);
    }
  };
}
