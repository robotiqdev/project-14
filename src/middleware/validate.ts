import { RequestHandler } from 'express';
import { ValidationResult } from '../validators/noteValidator';
import { ValidationError } from '../errors/AppError';

export function validate(validatorFn: (body: unknown) => ValidationResult): RequestHandler {
  return (_req, _res, _next) => {
    // Not implemented
  };
}
