import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/require-admin.middleware';

export const listArchivedTasks = async (
  _req: AuthenticatedRequest,
  _res: Response
): Promise<void> => {
  throw new Error('listArchivedTasks controller not implemented');
};

export const getArchivedTask = async (
  _req: Request,
  _res: Response
): Promise<void> => {
  throw new Error('getArchivedTask controller not implemented');
};

export const restoreTask = async (
  _req: Request,
  _res: Response
): Promise<void> => {
  throw new Error('restoreTask controller not implemented');
};
