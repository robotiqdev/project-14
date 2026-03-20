import { AppError } from './AppError';

export class InternalError extends AppError {
  constructor(message: string = 'Internal Server Error') {
    super(500, message);
    this.name = 'InternalError';
    this.isOperational = false;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
