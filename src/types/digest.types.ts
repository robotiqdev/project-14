export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export interface DigestEmailData {
  leadName: string;
  leadEmail: string;
  teamName: string;
  tasks: DigestTaskRow[];
  generatedAt: Date;
}

export interface DigestTaskRow {
  id: string;
  title: string;
  dueDate: Date;
  overdueDays: number;
  assigneeName: string | null;
  assigneeEmail: string | null;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}
