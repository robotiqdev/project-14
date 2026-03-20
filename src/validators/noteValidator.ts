export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, unknown>;
}

export function validateCreateNote(body: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (typeof body !== 'object' || body === null) {
    return {
      valid: false,
      errors: { title: ['Title is required'], body: ['Body is required'] },
    };
  }

  const b = body as Record<string, unknown>;

  // Validate title
  const titleErrors: string[] = [];
  if (b.title === undefined || b.title === null || b.title === '') {
    titleErrors.push('Title is required');
  } else if (typeof b.title !== 'string') {
    titleErrors.push('Title must be a string');
  } else {
    const trimmed = b.title.trim();
    if (trimmed.length === 0) {
      titleErrors.push('Title cannot be whitespace only');
    } else if (trimmed.length > 255) {
      titleErrors.push('Title must be 255 characters or less');
    }
  }
  if (titleErrors.length > 0) {
    errors.title = titleErrors;
  }

  // Validate body (accept 'content' as alias for backward compatibility)
  const bodyErrors: string[] = [];
  const bodyValue = b.body !== undefined ? b.body : b.content;
  if (bodyValue === undefined || bodyValue === null || bodyValue === '') {
    bodyErrors.push('Body is required');
  } else if (typeof bodyValue !== 'string') {
    bodyErrors.push('Body must be a string');
  } else if (bodyValue.length > 10000) {
    bodyErrors.push('Body must be 10000 characters or less');
  }
  if (bodyErrors.length > 0) {
    errors.body = bodyErrors;
  }

  const valid = Object.keys(errors).length === 0;
  return valid ? { valid: true } : { valid: false, errors };
}
