import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';

export function createCommentRouter(controller: CommentController): Router {
  const router = Router({ mergeParams: true });

  router.get('/tasks/:taskId/comments', controller.listComments);
  router.post('/tasks/:taskId/comments', controller.createComment);
  router.patch('/comments/:id', controller.updateComment);
  router.delete('/comments/:id', controller.deleteComment);

  return router;
}
