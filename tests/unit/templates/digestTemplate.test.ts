import { renderDigestEmail, renderPlainTextDigest } from '../../../src/templates/emails/digestTemplate';
import { DigestEmailData, DigestTaskRow, TaskPriority, TaskStatus } from '../../../src/types/digest.types';

const sampleTask: DigestTaskRow = {
  id: '1',
  title: 'Fix critical bug',
  dueDate: new Date('2024-01-10T12:00:00.000Z'),
  overdueDays: 5,
  assigneeName: 'John Doe',
  assigneeEmail: 'john@example.com',
  priority: TaskPriority.HIGH,
  status: TaskStatus.OVERDUE,
};

const sampleData: DigestEmailData = {
  leadName: 'Jane Smith',
  leadEmail: 'jane@example.com',
  teamName: 'Engineering Team',
  tasks: [sampleTask],
  generatedAt: new Date('2024-01-15T00:00:00.000Z'),
};

describe('renderDigestEmail', () => {
  describe('output structure', () => {
    it('should return an object with html, text, and subject properties', () => {
      const result = renderDigestEmail(sampleData);
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('subject');
    });

    it('should return a non-empty HTML string', () => {
      const result = renderDigestEmail(sampleData);
      expect(typeof result.html).toBe('string');
      expect(result.html.length).toBeGreaterThan(0);
    });

    it('should return a non-empty text string', () => {
      const result = renderDigestEmail(sampleData);
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('should return a non-empty subject string', () => {
      const result = renderDigestEmail(sampleData);
      expect(typeof result.subject).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);
    });
  });

  describe('HTML content', () => {
    it('should contain leadName in HTML output', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.html).toContain(sampleData.leadName);
    });

    it('should contain teamName in HTML output', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.html).toContain(sampleData.teamName);
    });

    it('should reflect the count of tasks in the HTML output', () => {
      const task2: DigestTaskRow = { ...sampleTask, id: '2', title: 'Second task' };
      const task3: DigestTaskRow = { ...sampleTask, id: '3', title: 'Third task' };
      const multiTaskData: DigestEmailData = {
        ...sampleData,
        tasks: [sampleTask, task2, task3],
      };
      const result = renderDigestEmail(multiTaskData);
      expect(result.html).toMatch(/3\s*(overdue\s*)?tasks?/i);
    });

    it('should render a "no overdue tasks" fallback message for empty tasks array', () => {
      const emptyData: DigestEmailData = { ...sampleData, tasks: [] };
      const result = renderDigestEmail(emptyData);
      expect(result.html).toMatch(/no overdue tasks/i);
    });

    it('should render each task row when multiple tasks are provided', () => {
      const task2: DigestTaskRow = { ...sampleTask, id: '2', title: 'Deploy feature' };
      const multiTaskData: DigestEmailData = {
        ...sampleData,
        tasks: [sampleTask, task2],
      };
      const result = renderDigestEmail(multiTaskData);
      expect(result.html).toContain(sampleTask.title);
      expect(result.html).toContain(task2.title);
    });

    it('should have balanced <div> opening and closing tags', () => {
      const result = renderDigestEmail(sampleData);
      const openDivs = (result.html.match(/<div\b/gi) || []).length;
      const closeDivs = (result.html.match(/<\/div>/gi) || []).length;
      expect(openDivs).toBe(closeDivs);
    });

    it('should have balanced <table> opening and closing tags', () => {
      const result = renderDigestEmail(sampleData);
      const openTables = (result.html.match(/<table\b/gi) || []).length;
      const closeTables = (result.html.match(/<\/table>/gi) || []).length;
      expect(openTables).toBe(closeTables);
    });

    it('should have balanced <tr> opening and closing tags', () => {
      const result = renderDigestEmail(sampleData);
      const openTrs = (result.html.match(/<tr\b/gi) || []).length;
      const closeTrs = (result.html.match(/<\/tr>/gi) || []).length;
      expect(openTrs).toBe(closeTrs);
    });

    it('should contain the generation date in the HTML', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.html).toContain(sampleData.generatedAt.getFullYear().toString());
    });

    it('should contain a link to dashboard in the footer', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.html).toMatch(/<a\s[^>]*href/i);
    });
  });

  describe('subject line', () => {
    it('should contain teamName in the subject line', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.subject).toContain(sampleData.teamName);
    });

    it('should start with "Daily Overdue Digest" prefix', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.subject).toMatch(/Daily Overdue Digest/i);
    });

    it('should contain the formatted date in the subject line', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.subject).toContain(sampleData.generatedAt.getFullYear().toString());
    });
  });

  describe('plain text fallback in result.text', () => {
    it('should not contain HTML tags in the text property', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.text).not.toMatch(/<[^>]+>/);
    });

    it('should contain teamName in the text property', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.text).toContain(sampleData.teamName);
    });

    it('should contain task title in the text property', () => {
      const result = renderDigestEmail(sampleData);
      expect(result.text).toContain(sampleTask.title);
    });

    it('should indicate "no overdue tasks" in text property for empty tasks', () => {
      const emptyData: DigestEmailData = { ...sampleData, tasks: [] };
      const result = renderDigestEmail(emptyData);
      expect(result.text).toMatch(/no overdue tasks/i);
    });
  });
});

describe('renderPlainTextDigest', () => {
  it('should produce a plain text string without HTML tags', () => {
    const result = renderPlainTextDigest(sampleData);
    expect(result).not.toMatch(/<[^>]+>/);
  });

  it('should return a string', () => {
    const result = renderPlainTextDigest(sampleData);
    expect(typeof result).toBe('string');
  });

  it('should contain teamName in plain text output', () => {
    const result = renderPlainTextDigest(sampleData);
    expect(result).toContain(sampleData.teamName);
  });

  it('should contain task title in plain text output', () => {
    const result = renderPlainTextDigest(sampleData);
    expect(result).toContain(sampleTask.title);
  });

  it('should indicate "no overdue tasks" for empty tasks array', () => {
    const emptyData: DigestEmailData = { ...sampleData, tasks: [] };
    const result = renderPlainTextDigest(emptyData);
    expect(result).toMatch(/no overdue tasks/i);
  });

  it('should list all task titles for multiple tasks', () => {
    const task2: DigestTaskRow = { ...sampleTask, id: '2', title: 'Deploy feature' };
    const multiTaskData: DigestEmailData = {
      ...sampleData,
      tasks: [sampleTask, task2],
    };
    const result = renderPlainTextDigest(multiTaskData);
    expect(result).toContain(sampleTask.title);
    expect(result).toContain(task2.title);
  });

  it('should contain leadName in plain text output', () => {
    const result = renderPlainTextDigest(sampleData);
    expect(result).toContain(sampleData.leadName);
  });
});
