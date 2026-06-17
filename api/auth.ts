import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from './supabase.js';
import { JWT_SECRET, authenticateJWT, AuthenticatedRequest } from './middleware.js';

const router = express.Router();

// Short-lived token secret for mathematical captcha verification.
// Encrypting the answer in the token prevents server memory usage in Vercel Serverless environment.
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'g-order-captcha-secret-key-12345';

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  const num1 = Math.floor(Math.random() * 9) + 1; // 1-9
  const num2 = Math.floor(Math.random() * 9) + 1; // 1-9
  const answer = num1 + num2;

  // Create a token containing the answer that expires in 3 minutes
  const captchaToken = jwt.sign({ answer }, CAPTCHA_SECRET, { expiresIn: '3m' });

  res.json({
    question: `${num1} + ${num2} = ?`,
    captchaToken
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, captchaAnswer, captchaToken } = req.body;

  if (!username || !password || captchaAnswer === undefined || !captchaToken) {
    return res.status(400).json({ error: '请填写所有必填字段。' });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
    return res.status(400).json({ error: '用户名长度必须在3到20个字符之间。' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度不能少于6位字符。' });
  }

  // 1. Check if registration is enabled
  try {
    const { data: setting, error: settingErr } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .single();

    // If setting doesn't exist, default to true. Otherwise, check its value.
    if (!settingErr && setting && setting.value === 'false') {
      return res.status(403).json({ error: '系统当前已关闭自主注册通道，请联系管理员分配账号。' });
    }
  } catch (err) {
    console.error('Check registration setting error:', err);
  }

  // 2. Verify Captcha
  try {
    const decoded = jwt.verify(captchaToken, CAPTCHA_SECRET) as { answer: number };
    if (parseInt(captchaAnswer) !== decoded.answer) {
      return res.status(400).json({ error: '验证码输入错误。' });
    }
  } catch (err) {
    return res.status(400).json({ error: '验证码已过期，请点击刷新后重试。' });
  }

  try {
    // 3. Check if username exists
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (checkErr) {
      throw checkErr;
    }

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在，请换一个用户名。' });
    }

    // 4. Check if this is the first user. First user becomes admin.
    const { count, error: countErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      throw countErr;
    }

    const role = (count === 0) ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Insert new user
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        username: trimmedUsername,
        password_hash: passwordHash,
        role,
        points: 100, // Gift 100 points initially
        status: 'active'
      })
      .select()
      .single();

    if (insertErr || !newUser) {
      throw insertErr || new Error('注册用户失败');
    }

    // Record points history for initial gift
    await supabase.from('points_history').insert({
      user_id: newUser.id,
      action: 'register_gift',
      points_changed: 100,
      current_points: 100,
      description: '新用户注册赠送100积分'
    });

    // 6. Sign JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Write HttpOnly Cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({
      message: '注册成功！',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        points: newUser.points,
        monthly_card_expires_at: newUser.monthly_card_expires_at,
        status: newUser.status
      }
    });

  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: '服务器内部错误，请稍后再试。' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码。' });
  }

  const trimmedUsername = username.trim();

  try {
    // 1. Fetch user
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('username', trimmedUsername)
      .maybeSingle();

    if (fetchErr) {
      throw fetchErr;
    }

    if (!user) {
      return res.status(400).json({ error: '用户名或密码错误。' });
    }

    if (user.status === 'frozen') {
      return res.status(403).json({ error: '您的账号已被冻结，请联系管理员。' });
    }

    // 2. Validate Password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: '用户名或密码错误。' });
    }

    // 3. Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Write HttpOnly Cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({
      message: '登录成功！',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        points: user.points,
        monthly_card_expires_at: user.monthly_card_expires_at,
        status: user.status
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: '服务器内部错误，请稍后再试。' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: '登出成功。' });
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (fetchErr || !user) {
      return res.status(401).json({ error: '用户未找到。' });
    }

    if (user.status === 'frozen') {
      res.clearCookie('auth_token');
      return res.status(403).json({ error: '您的账号已被冻结，请联系管理员。' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        points: user.points,
        monthly_card_expires_at: user.monthly_card_expires_at,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: '服务器内部错误。' });
  }
});

export default router;
