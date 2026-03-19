import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/require-admin.middleware';

export const listAuditLogs = async (
  _req: AuthenticatedRequest,
  _res: Response
): Promise<void> => {
  throw new Error('listAuditLogs controller not implemented');
};

export const getAuditLog = async (
  _req: Request,
  _res: Response
): Promise<void> => {
  throw new Error('getAuditLog controller not implemented');
};
