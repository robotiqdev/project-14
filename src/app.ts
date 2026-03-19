import express from 'express';
import adminRouter from './api/routes/admin/index';

const app = express();

app.use(express.json());
app.use('/api/admin', adminRouter);

export default app;
