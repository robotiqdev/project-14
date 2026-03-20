import { AppError } from './AppError';

export class DatabaseError extends AppError {
  constructor(message: string, code = 'DATABASE_ERROR') {
    super(message, 500, code, false);
  }
}
