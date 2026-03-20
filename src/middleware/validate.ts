import { RequestHandler } from 'express';
import { ValidationResult } from '../validators/noteValidator';
import { ValidationError } from '../errors/AppError';

export function validate(validatorFn: (body: unknown) => ValidationResult): RequestHandler {
  return (req, _res, next) => {
    const result = validatorFn(req.body);
    if (!result.valid) {
      next(new ValidationError(result.errors ?? {}));
      return;
    }
    next();
  };
}
