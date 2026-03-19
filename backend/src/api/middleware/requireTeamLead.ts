import { Request, Response, NextFunction } from 'express';

export function requireTeamLead(_req: Request, _res: Response, _next: NextFunction): void {
  throw new Error('Not implemented');
}
