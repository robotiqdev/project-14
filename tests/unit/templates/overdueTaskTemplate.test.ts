import { renderOverdueTaskRow } from '../../../src/templates/emails/overdueTaskTemplate';
import { DigestTaskRow, TaskPriority, TaskStatus } from '../../../src/types/digest.types';

const baseTask: DigestTaskRow = {
  id: '1',
  title: 'Fix critical bug',
  dueDate: new Date('2024-01-10T12:00:00.000Z'),
  overdueDays: 3,
  assigneeName: 'Alice Johnson',
  assigneeEmail: 'alice@example.com',
  priority: TaskPriority.HIGH,
  status: TaskStatus.OVERDUE,
};

describe('renderOverdueTaskRow', () => {
  describe('return type', () => {
    it('should return a non-empty string', () => {
      const result = renderOverdueTaskRow(baseTask);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('task title', () => {
    it('should render the task title in the output', () => {
      const result = renderOverdueTaskRow(baseTask);
      expect(result).toContain(baseTask.title);
    });

    it('should render a different task title correctly', () => {
      const task = { ...baseTask, title: 'Update dependencies' };
      const result = renderOverdueTaskRow(task);
      expect(result).toContain('Update dependencies');
    });
  });

  describe('due date', () => {
    it('should render the dueDate year in the output', () => {
      const result = renderOverdueTaskRow(baseTask);
      expect(result).toContain(baseTask.dueDate.getFullYear().toString());
    });

    it('should render the due date in a human-readable locale format', () => {
      const result = renderOverdueTaskRow(baseTask);
      // Date should appear formatted, not as a raw ISO string like "2024-01-10T12:00:00.000Z"
      expect(result).not.toContain('T12:00:00.000Z');
    });
  });

  describe('priority badge class', () => {
    it('should render HIGH priority with a red badge class', () => {
      const task = { ...baseTask, priority: TaskPriority.HIGH };
      const result = renderOverdueTaskRow(task);
      expect(result).toMatch(/red|priority-high/i);
    });

    it('should render MEDIUM priority with an orange badge class', () => {
      const task = { ...baseTask, priority: TaskPriority.MEDIUM };
      const result = renderOverdueTaskRow(task);
      expect(result).toMatch(/orange|priority-medium/i);
    });

    it('should render LOW priority with a gray badge class', () => {
      const task = { ...baseTask, priority: TaskPriority.LOW };
      const result = renderOverdueTaskRow(task);
      expect(result).toMatch(/gray|grey|priority-low/i);
    });

    it('should render the HIGH priority label text', () => {
      const task = { ...baseTask, priority: TaskPriority.HIGH };
      const result = renderOverdueTaskRow(task);
      expect(result.toUpperCase()).toContain('HIGH');
    });

    it('should render the MEDIUM priority label text', () => {
      const task = { ...baseTask, priority: TaskPriority.MEDIUM };
      const result = renderOverdueTaskRow(task);
      expect(result.toUpperCase()).toContain('MEDIUM');
    });

    it('should render the LOW priority label text', () => {
      const task = { ...baseTask, priority: TaskPriority.LOW };
      const result = renderOverdueTaskRow(task);
      expect(result.toUpperCase()).toContain('LOW');
    });
  });

  describe('assignee', () => {
    it('should render assigneeName when provided', () => {
      const result = renderOverdueTaskRow(baseTask);
      expect(result).toContain(baseTask.assigneeName);
    });

    it('should render "Unassigned" when assigneeName is null', () => {
      const task = { ...baseTask, assigneeName: null };
      const result = renderOverdueTaskRow(task);
      expect(result).toContain('Unassigned');
    });

    it('should not render null as literal text when assigneeName is null', () => {
      const task = { ...baseTask, assigneeName: null };
      const result = renderOverdueTaskRow(task);
      expect(result).not.toContain('>null<');
      expect(result).not.toMatch(/>\s*null\s*</);
    });

    it('should render a different assignee name correctly', () => {
      const task = { ...baseTask, assigneeName: 'Bob Builder' };
      const result = renderOverdueTaskRow(task);
      expect(result).toContain('Bob Builder');
    });
  });

  describe('overdue days', () => {
    it('should render overdueDays as "X days overdue"', () => {
      const result = renderOverdueTaskRow(baseTask);
      expect(result).toMatch(/3 days? overdue/i);
    });

    it('should render 1 day overdue correctly', () => {
      const task = { ...baseTask, overdueDays: 1 };
      const result = renderOverdueTaskRow(task);
      expect(result).toMatch(/1 days? overdue/i);
    });

    it('should render 10 days overdue correctly', () => {
      const task = { ...baseTask, overdueDays: 10 };
      const result = renderOverdueTaskRow(task);
      expect(result).toMatch(/10 days? overdue/i);
    });
  });
});
