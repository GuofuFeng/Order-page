import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'g-order-jwt-fallback-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: '请登录后再试。' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      username: string;
      role: 'admin' | 'user';
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: '登录会话已过期，请重新登录。' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: '请登录后再试。' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '拒绝访问：仅限管理员。' });
  }

  next();
}
