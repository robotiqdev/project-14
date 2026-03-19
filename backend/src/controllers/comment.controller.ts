import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';

export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  listComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { taskId } = req.params;
      const comments = await this.commentService.getThreadedComments(taskId, { threaded: true });
      res.json(comments);
    } catch (err) {
      next(err);
    }
  };

  createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { taskId } = req.params;
      const actorId = (req as any).user?.id;
      const comment = await this.commentService.createComment(taskId, req.body, actorId);
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const comment = await this.commentService.updateComment(id, req.body, actorId);
      res.json(comment);
    } catch (err) {
      next(err);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const actorId = (req as any).user?.id;
      const role = (req as any).user?.role;
      await this.commentService.deleteComment(id, actorId, role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
