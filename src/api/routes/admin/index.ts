import { Router } from 'express';
import archiveRoutes from './archive.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/archives', archiveRoutes);
router.use('/audit', auditRoutes);

export { archiveRoutes, auditRoutes };
export default router;
