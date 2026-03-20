import { AppError } from './AppError';

export class ValidationError extends AppError {
  details: any[];

  constructor(message: string, details: any[] = []) {
    super(422, message);
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
