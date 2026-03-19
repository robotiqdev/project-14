import { Router } from 'express';
import { requireAdmin } from '../../middleware/require-admin.middleware';
import { validateUUID } from '../../middleware/validate-uuid.middleware';
import {
  listArchivedTasks,
  getArchivedTask,
  restoreTask,
} from '../../controllers/admin/archive.controller';

const router = Router();

router.get('/', requireAdmin, listArchivedTasks);
router.get('/:taskId', requireAdmin, validateUUID('taskId'), getArchivedTask);
router.post('/:taskId/restore', requireAdmin, validateUUID('taskId'), restoreTask);

export default router;
