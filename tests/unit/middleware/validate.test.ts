import { Request, Response, NextFunction } from 'express';
import { validate } from '../../../src/middleware/validate';
import { ValidationError } from '../../../src/errors/AppError';

describe('validate middleware factory', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { body: {} };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('when validatorFn returns { valid: true }', () => {
    it('should call next() with no arguments', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass req.body to validatorFn', () => {
      const body = { title: 'Test note', content: 'Some content' };
      mockReq.body = body;
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(validatorFn).toHaveBeenCalledWith(body);
    });

    it('should not call next with an error argument when valid', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      const firstArg = mockNext.mock.calls[0][0];
      expect(firstArg).toBeUndefined();
    });
  });

  describe('when validatorFn returns { valid: false, errors: {...} }', () => {
    it('should call next() exactly once with a ValidationError instance', () => {
      const errors = { title: 'Title is required' };
      const validatorFn = jest.fn().mockReturnValue({ valid: false, errors });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const [error] = mockNext.mock.calls[0];
      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should pass ValidationError with details matching the validator errors', () => {
      const errors = { title: 'Title is required', content: 'Content must not be empty' };
      const validatorFn = jest.fn().mockReturnValue({ valid: false, errors });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      const [error] = mockNext.mock.calls[0];
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual(errors);
    });

    it('should pass req.body to validatorFn even when validation fails', () => {
      const body = { title: '' };
      mockReq.body = body;
      const errors = { title: 'Title must not be empty' };
      const validatorFn = jest.fn().mockReturnValue({ valid: false, errors });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(validatorFn).toHaveBeenCalledWith(body);
    });

    it('should not call next without an error argument when validation fails', () => {
      const errors = { title: 'Title is required' };
      const validatorFn = jest.fn().mockReturnValue({ valid: false, errors });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      const [error] = mockNext.mock.calls[0];
      expect(error).toBeDefined();
      expect(error).not.toBeUndefined();
    });
  });

  describe('factory pattern', () => {
    it('should return a function (RequestHandler)', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const handler = validate(validatorFn);

      expect(typeof handler).toBe('function');
    });

    it('should call the provided validatorFn on each handler invocation', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const handler = validate(validatorFn);

      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      handler(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(validatorFn).toHaveBeenCalledTimes(2);
    });

    it('should produce independent handlers from different validate() calls', () => {
      const validatorFnA = jest.fn().mockReturnValue({ valid: true });
      const validatorFnB = jest.fn().mockReturnValue({ valid: false, errors: { title: 'required' } });
      const handlerA = validate(validatorFnA);
      const handlerB = validate(validatorFnB);

      handlerA(mockReq as Request, mockRes as Response, mockNext as NextFunction);
      handlerB(mockReq as Request, mockRes as Response, mockNext as NextFunction);

      expect(validatorFnA).toHaveBeenCalledTimes(1);
      expect(validatorFnB).toHaveBeenCalledTimes(1);
    });
  });
});
