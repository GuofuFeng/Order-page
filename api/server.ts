import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth';
import syncRouter from './sync';
import billingRouter from './billing';
import adminRouter from './admin';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routing Prefix config
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverless: true });
});

// Vercel Serverless Function expects the Express application instance to be exported
export default app;
