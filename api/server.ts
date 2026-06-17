import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth.js';
import syncRouter from './sync.js';
import billingRouter from './billing.js';
import adminRouter from './admin.js';

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
