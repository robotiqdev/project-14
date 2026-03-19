export type UserRole = 'ADMIN' | 'LEAD' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Task {
  id: string;
  title: string;
  isArchived: boolean;
  leads: User[];
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  parentCommentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  children?: Comment[];
}

export type AuditAction = 'CREATED' | 'EDITED' | 'DELETED' | 'ARCHIVED' | 'RESTORED';

export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface NotificationRecipient {
  userId: string;
  channels: NotificationChannel[];
}

export interface NotificationPayload {
  taskId: string;
  actorId: string;
  body: string;
  recipients: NotificationRecipient[];
  commentId?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: NotificationPayload;
}

export interface SocketEvent {
  event: string;
  data: unknown;
}

export interface CreateCommentDto {
  body: string;
  parentCommentId?: string;
}

export interface UpdateCommentDto {
  body: string;
}

export interface GetThreadedCommentsOpts {
  threaded?: boolean;
  page?: number;
  limit?: number;
}
