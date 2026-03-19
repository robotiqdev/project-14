export class ForbiddenError extends Error {
  public statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  public statusCode = 400;
  constructor(message = 'Validation Error') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  constructor(message = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
