import { DigestTaskRow, TaskPriority } from '../../types/digest.types';
import { formatDate } from '../../utils/dateTime.util';

function getPriorityBadgeClass(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.HIGH:
      return 'priority-high red';
    case TaskPriority.MEDIUM:
      return 'priority-medium orange';
    case TaskPriority.LOW:
      return 'priority-low gray';
    default:
      return 'priority-low gray';
  }
}

export function renderOverdueTaskRow(task: DigestTaskRow): string {
  const badgeClass = getPriorityBadgeClass(task.priority);
  const assignee = task.assigneeName ?? 'Unassigned';
  const formattedDate = formatDate(task.dueDate, 'UTC');
  const overdueDaysText = `${task.overdueDays} days overdue`;

  return `<tr>
    <td>${task.title}</td>
    <td>${formattedDate}</td>
    <td><span class="${badgeClass}">${task.priority}</span></td>
    <td>${assignee}</td>
    <td>${overdueDaysText}</td>
  </tr>`;
}
