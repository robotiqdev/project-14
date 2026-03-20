import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 422, code);
  }
}
