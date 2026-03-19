import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/require-admin.middleware';
import { AuditService } from '../../../services/audit.service';
import { AuditLogFilter } from '../../../types/archive.types';

function getAuditService(): AuditService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AuditService(null as any);
}

export const listAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const auditService = getAuditService();
    const { entity_type, entity_id, actor_id, action, from, to } = req.query as Record<string, string | undefined>;

    const filter: AuditLogFilter = {};

    if (entity_type) filter.entity_type = entity_type;
    if (entity_id) filter.entity_id = entity_id;
    if (actor_id) filter.actor_id = actor_id;
    if (action) filter.action = action;
    if (from) filter.from_date = from;
    if (to) filter.to_date = to;

    if (req.query.page !== undefined) {
      const page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) {
        res.status(400).json({ error: 'Invalid page parameter' });
        return;
      }
      filter.page = page;
    }

    if (req.query.limit !== undefined) {
      const limit = parseInt(req.query.limit as string, 10);
      if (isNaN(limit) || limit < 1) {
        res.status(400).json({ error: 'Invalid limit parameter' });
        return;
      }
      filter.limit = limit;
    }

    const result = await auditService.listAuditLogs(req.user!.id, filter);
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
};

export const getAuditLog = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const auditService = getAuditService();
    const { logId } = req.params;
    const result = await auditService.getAuditLog(req.user!.id, logId);
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
};
