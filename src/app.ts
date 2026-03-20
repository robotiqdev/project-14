import express, { Application } from 'express';
import noteRouter from './modules/notes/note.routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(express.json());

app.use('/api/v1/notes', noteRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
export default app;
