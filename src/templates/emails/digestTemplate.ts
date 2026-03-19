import { DigestEmailData, RenderedEmail } from '../../types/digest.types';
import { renderOverdueTaskRow } from './overdueTaskTemplate';
import { formatDate } from '../../utils/dateTime.util';

export function renderPlainTextDigest(data: DigestEmailData): string {
  const dateStr = formatDate(data.generatedAt, 'UTC');
  const taskCount = data.tasks.length;

  const taskLines = data.tasks.length === 0
    ? 'No overdue tasks at this time.'
    : data.tasks.map((task) => {
        const assignee = task.assigneeName ?? 'Unassigned';
        const dueDate = formatDate(task.dueDate, 'UTC');
        return `- ${task.title} | Due: ${dueDate} | Priority: ${task.priority} | Assignee: ${assignee} | ${task.overdueDays} days overdue`;
      }).join('\n');

  return `Daily Overdue Digest - ${data.teamName} - ${dateStr}

Hi ${data.leadName},

You have ${taskCount} overdue task(s) for team: ${data.teamName}.

${taskLines}

Visit your dashboard for more details.
`;
}

export function renderDigestEmail(data: DigestEmailData): RenderedEmail {
  const dateStr = formatDate(data.generatedAt, 'UTC');
  const taskCount = data.tasks.length;
  const subject = `Daily Overdue Digest – ${data.teamName} – ${dateStr}`;

  const taskRows = data.tasks.length === 0
    ? `<tr><td colspan="5">No overdue tasks at this time.</td></tr>`
    : data.tasks.map(renderOverdueTaskRow).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body>
  <div>
    <div>
      <h1>Daily Overdue Digest</h1>
      <h2>${data.teamName}</h2>
      <p>Generated: ${dateStr}</p>
    </div>
    <div>
      <p>Hi ${data.leadName},</p>
      <p>There are ${taskCount} overdue tasks for your team.</p>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Due Date</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Overdue</th>
          </tr>
        </thead>
        <tbody>
          ${taskRows}
        </tbody>
      </table>
    </div>
    <div>
      <p>Visit your <a href="/dashboard">dashboard</a> to manage your tasks.</p>
    </div>
  </div>
</body>
</html>`;

  const text = renderPlainTextDigest(data);

  return { html, text, subject };
}
