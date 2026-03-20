export class NoteNotFoundError extends Error {
  constructor(public readonly noteId: string) {
    super(`Note not found: ${noteId}`);
    this.name = 'NoteNotFoundError';
    Object.setPrototypeOf(this, NoteNotFoundError.prototype);
  }
}
