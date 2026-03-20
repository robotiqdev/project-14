import { UpdateNoteSchema } from '../../../src/validators/note.validator';

describe('UpdateNoteSchema', () => {
  describe('valid inputs', () => {
    it('accepts body with only "title" field', () => {
      const result = UpdateNoteSchema.safeParse({ title: 'My Note Title' });
      expect(result.success).toBe(true);
    });

    it('accepts body with only "body" field', () => {
      const result = UpdateNoteSchema.safeParse({ body: 'Some note content' });
      expect(result.success).toBe(true);
    });

    it('accepts body with both "title" and "body" fields', () => {
      const result = UpdateNoteSchema.safeParse({
        title: 'My Note Title',
        body: 'Some note content',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty object (at least one field required)', () => {
      const result = UpdateNoteSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.toLowerCase().includes('at least one'))).toBe(true);
      }
    });

    it('rejects title as empty string', () => {
      const result = UpdateNoteSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects body as empty string', () => {
      const result = UpdateNoteSchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('rejects unknown extra fields (Zod .strict())', () => {
      const result = UpdateNoteSchema.safeParse({
        title: 'Valid Title',
        unknownField: 'should not be allowed',
      });
      expect(result.success).toBe(false);
    });

    it('rejects when title is empty string even when body is also provided', () => {
      const result = UpdateNoteSchema.safeParse({ title: '', body: 'valid body' });
      expect(result.success).toBe(false);
    });

    it('rejects when body is empty string even when title is also provided', () => {
      const result = UpdateNoteSchema.safeParse({ title: 'valid title', body: '' });
      expect(result.success).toBe(false);
    });
  });
});
