import { AppError } from './AppError';
import { ValidationError } from './ValidationError';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  isOperational: boolean;
  details?: any[];
}

export function formatErrorResponse(err: AppError): ErrorResponse {
  const response: ErrorResponse = {
    statusCode: err.statusCode,
    message: err.message,
    isOperational: err.isOperational,
  };

  if (err instanceof ValidationError && err.details) {
    response.details = err.details;
  }

  return response;
}
