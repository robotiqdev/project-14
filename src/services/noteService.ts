import { Note, CreateNoteInput } from '../models/note';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function validateCreateNote(input: any): void {
  if (!input || typeof input.title !== 'string' || input.title.trim() === '') {
    throw new AppError('title is required and must be a non-empty string', 422);
  }
  if (input.title.length > 255) {
    throw new AppError('title must not exceed 255 characters', 422);
  }
  if (!input || typeof input.body !== 'string' || input.body.trim() === '') {
    throw new AppError('body is required and must be a non-empty string', 422);
  }
}

let nextId = 1;

export function createNote(input: CreateNoteInput): Note {
  const now = new Date().toISOString();
  return {
    id: nextId++,
    title: input.title,
    body: input.body,
    createdAt: now,
    updatedAt: now,
  };
}
