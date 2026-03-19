export interface ISocketManager {
  emitToTask(taskId: string, event: { event: string; data: unknown }): void;
}

export class SocketManager implements ISocketManager {
  emitToTask(_taskId: string, _event: { event: string; data: unknown }): void {
    // implementation
  }
}
