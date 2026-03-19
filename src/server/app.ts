import express, { Application } from 'express';
import { AssignmentService } from './modules/assignments/assignment.service';
import { createAssignmentRouter } from './modules/assignments/assignment.routes';

export function createApp(assignmentService?: AssignmentService): Application {
  const app = express();

  app.use(express.json());

  if (assignmentService) {
    app.use('/api', createAssignmentRouter(assignmentService));
  }

  return app;
}

export default createApp;
