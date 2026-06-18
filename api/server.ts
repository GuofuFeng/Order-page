import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './auth.js';
import syncRouter from './sync.js';
import billingRouter from './billing.js';
import adminRouter from './admin.js';
import { supabase } from './supabase.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routing Prefix config
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);

// Diagnostic health check route to verify Supabase connectivity
app.get('/api/health', async (req, res) => {
  try {
    const start = Date.now();
    const { data, error } = await supabase.from('users').select('id').limit(1);
    const duration = Date.now() - start;

    if (error) {
      return res.status(500).json({
        status: 'error',
        message: '数据库查询报错',
        details: error.message,
        hint: error.hint,
        code: error.code
      });
    }

    return res.json({
      status: 'ok',
      database: 'connected',
      responseTimeMs: duration,
      hasData: data.length > 0
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: '系统异常，未连接至数据库',
      details: err.message
    });
  }
});

// Vercel Serverless Function expects the Express application instance to be exported
export default app;
