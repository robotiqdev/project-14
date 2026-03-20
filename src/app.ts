import * as express from 'express';
import noteRouter from './routes/noteRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use('/notes', noteRouter);

app.use(errorHandler);

export default app;
