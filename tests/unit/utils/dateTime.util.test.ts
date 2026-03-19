import { formatDate, calculateOverdueDays } from '../../../src/utils/dateTime.util';

describe('formatDate', () => {
  describe('return type', () => {
    it('should return a string', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const result = formatDate(date, 'UTC');
      expect(typeof result).toBe('string');
    });

    it('should return a non-empty string', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const result = formatDate(date, 'UTC');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('date formatting', () => {
    it('should contain the year of the date', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const result = formatDate(date, 'UTC');
      expect(result).toContain('2024');
    });

    it('should format using Intl.DateTimeFormat-style output (not raw ISO)', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const result = formatDate(date, 'UTC');
      // Should not return a raw ISO string
      expect(result).not.toBe(date.toISOString());
    });

    it('should handle epoch date (Jan 1 1970)', () => {
      const date = new Date(0);
      const result = formatDate(date, 'UTC');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle a date at end of year', () => {
      const date = new Date('2023-12-31T23:59:59.000Z');
      const result = formatDate(date, 'UTC');
      expect(typeof result).toBe('string');
    });
  });

  describe('timezone support', () => {
    it('should produce different output for different timezones when date crosses day boundary', () => {
      // 2024-06-15 01:00 UTC is still June 14 in Los Angeles (UTC-7)
      const date = new Date('2024-06-15T01:00:00.000Z');
      const utcResult = formatDate(date, 'UTC');
      const laResult = formatDate(date, 'America/Los_Angeles');
      expect(utcResult).not.toBe(laResult);
    });

    it('should accept UTC as a valid timezone', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      expect(() => formatDate(date, 'UTC')).not.toThrow();
    });

    it('should accept IANA timezone strings like "America/New_York"', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      expect(() => formatDate(date, 'America/New_York')).not.toThrow();
    });

    it('should accept "Europe/London" as a valid timezone', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      expect(() => formatDate(date, 'Europe/London')).not.toThrow();
    });
  });
});

describe('calculateOverdueDays', () => {
  describe('return type', () => {
    it('should return a number', () => {
      const dueDate = new Date('2024-01-10T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(typeof result).toBe('number');
    });

    it('should return a finite number', () => {
      const dueDate = new Date('2024-01-10T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(isFinite(result)).toBe(true);
    });
  });

  describe('overdue calculations', () => {
    it('should return 5 when task was due 5 days ago', () => {
      const dueDate = new Date('2024-01-10T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBe(5);
    });

    it('should return 1 when task was due exactly 1 day ago', () => {
      const dueDate = new Date('2024-01-14T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBe(1);
    });

    it('should return positive value when task is overdue', () => {
      const dueDate = new Date('2024-01-01T00:00:00.000Z');
      const asOf = new Date('2024-01-10T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBeGreaterThan(0);
    });

    it('should return 30 when task was due 30 days ago', () => {
      const dueDate = new Date('2024-01-01T00:00:00.000Z');
      const asOf = new Date('2024-01-31T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBe(30);
    });
  });

  describe('non-overdue tasks', () => {
    it('should return 0 when dueDate equals asOf', () => {
      const date = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(date, date);
      expect(result).toBe(0);
    });

    it('should return a non-positive value when task is not yet overdue', () => {
      const dueDate = new Date('2024-01-20T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBeLessThanOrEqual(0);
    });

    it('should return -5 when task is due 5 days in the future', () => {
      const dueDate = new Date('2024-01-20T00:00:00.000Z');
      const asOf = new Date('2024-01-15T00:00:00.000Z');
      const result = calculateOverdueDays(dueDate, asOf);
      expect(result).toBe(-5);
    });
  });
});
