import { Server, Socket } from 'socket.io';

export function registerCommentSocket(io: Server): void {
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // validate JWT token
    next();
  });

  io.on('connection', (socket: Socket) => {
    socket.on('joinRoom', (taskId: string) => {
      socket.join(`task:${taskId}`);
    });
  });
}
