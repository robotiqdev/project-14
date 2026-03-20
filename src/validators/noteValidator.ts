export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, unknown>;
}

// Stub — implementation provided in a future task
export function validateCreateNote(_body: unknown): ValidationResult {
  throw new Error('validateCreateNote: not implemented');
}
