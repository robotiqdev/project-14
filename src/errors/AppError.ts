export class ValidationError extends Error {
  public readonly details: Record<string, unknown>;

  constructor(details: Record<string, unknown>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
