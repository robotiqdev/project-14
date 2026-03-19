import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/require-admin.middleware';
import { ArchiveService } from '../../../services/archive.service';
import { ArchiveFilter } from '../../../types/archive.types';

function getArchiveService(): ArchiveService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new ArchiveService(null as any, null as any);
}

export const listArchivedTasks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const archiveService = getArchiveService();
    const { team_id, from, to, search } = req.query as Record<string, string | undefined>;

    const filter: ArchiveFilter = {};

    if (team_id) filter.team_id = team_id;
    if (from) filter.from_date = from;
    if (to) filter.to_date = to;
    if (search) filter.search = search;

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

    const result = await archiveService.listArchivedTasks(req.user!.id, filter);
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
};

export const getArchivedTask = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const archiveService = getArchiveService();
    const { taskId } = req.params;
    const result = await archiveService.getArchivedTask(req.user!.id, taskId);
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
};

export const restoreTask = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const archiveService = getArchiveService();
    const { taskId } = req.params;
    const result = await archiveService.restoreTask(req.user!.id, taskId);
    res.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
};
