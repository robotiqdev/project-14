import { Router } from 'express';
import { requireAdmin } from '../../middleware/require-admin.middleware';
import { validateUUID } from '../../middleware/validate-uuid.middleware';
import { listAuditLogs, getAuditLog } from '../../controllers/admin/audit.controller';

const router = Router();

router.get('/', requireAdmin, listAuditLogs);
router.get('/:logId', requireAdmin, validateUUID('logId'), getAuditLog);

export default router;
