import express from 'express';
import { supabase } from './supabase';
import { authenticateJWT, requireAdmin, AuthenticatedRequest } from './middleware';

const router = express.Router();

// Apply requireAdmin to all routes in this router
router.use(authenticateJWT);
router.use(requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, points, monthly_card_expires_at, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ error: '获取用户列表失败。' });
  }
});

// POST /api/admin/user/adjust-points - Manually adjust user points
router.post('/user/adjust-points', async (req: AuthenticatedRequest, res) => {
  const { targetUserId, amount, reason } = req.body;

  if (!targetUserId || amount === undefined || isNaN(parseInt(amount))) {
    return res.status(400).json({ error: '请提供目标用户ID和正确的调整点数。' });
  }

  const change = parseInt(amount);

  try {
    // 1. Fetch current user points
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('username, points')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ error: '目标用户不存在。' });
    }

    const newPoints = Math.max(0, user.points + change);

    // 2. Update points
    const { error: updateErr } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('id', targetUserId);

    if (updateErr) throw updateErr;

    // 3. Log history
    await supabase.from('points_history').insert({
      user_id: targetUserId,
      action: 'admin_modify',
      points_changed: change,
      current_points: newPoints,
      description: reason || `管理员手动修改积分: ${change > 0 ? '+' : ''}${change}。备注: ${reason || '无'}`
    });

    res.json({
      message: `已成功为用户 ${user.username} 的积分调整了 ${change}，当前积分为 ${newPoints}。`,
      points: newPoints
    });

  } catch (err) {
    console.error('Admin adjust points error:', err);
    res.status(500).json({ error: '调整用户积分失败。' });
  }
});

// POST /api/admin/user/adjust-monthly-card - Give or adjust monthly card expiry
router.post('/user/adjust-monthly-card', async (req: AuthenticatedRequest, res) => {
  const { targetUserId, days } = req.body; // days: positive number (days to add), or 0 to clear

  if (!targetUserId || days === undefined || isNaN(parseInt(days))) {
    return res.status(400).json({ error: '请提供目标用户ID和正确的天数。' });
  }

  const durationDays = parseInt(days);

  try {
    // Fetch target user info
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('username, monthly_card_expires_at, points')
      .eq('id', targetUserId)
      .single();

    if (fetchErr || !user) {
      return res.status(404).json({ error: '目标用户不存在。' });
    }

    let newExpiry: string | null = null;

    if (durationDays > 0) {
      const currentExpiry = user.monthly_card_expires_at ? new Date(user.monthly_card_expires_at).getTime() : 0;
      const now = new Date().getTime();

      // Extend from current expiry if it's in the future, otherwise from now
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const finalTime = baseTime + durationDays * 24 * 60 * 60 * 1000;
      newExpiry = new Date(finalTime).toISOString();
    } else {
      // Clear monthly card
      newExpiry = null;
    }

    // Update DB
    const { error: updateErr } = await supabase
      .from('users')
      .update({ monthly_card_expires_at: newExpiry })
      .eq('id', targetUserId);

    if (updateErr) throw updateErr;

    // Log history (as 0 points transaction)
    await supabase.from('points_history').insert({
      user_id: targetUserId,
      action: 'admin_modify',
      points_changed: 0,
      current_points: user.points,
      description: durationDays > 0 ? `管理员赠送月卡 ${durationDays} 天。` : '管理员清除月卡。'
    });

    res.json({
      message: durationDays > 0
        ? `已成功为用户 ${user.username} 办理月卡，到期时间为 ${newExpiry?.split('T')[0]}。`
        : `已成功清除用户 ${user.username} 的月卡。`,
      monthly_card_expires_at: newExpiry
    });

  } catch (err) {
    console.error('Admin adjust monthly card error:', err);
    res.status(500).json({ error: '修改月卡时发生服务器内部错误。' });
  }
});

// POST /api/admin/settings/toggle-register - Turn self-registration on or off
router.post('/settings/toggle-register', async (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;

  if (enabled === undefined) {
    return res.status(400).json({ error: '参数 enabled 缺失。' });
  }

  const valueStr = enabled ? 'true' : 'false';

  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'registration_enabled', value: valueStr });

    if (error) throw error;

    res.json({
      message: enabled ? '自主注册已开启。' : '自主注册已关闭，新账号需由管理员分配。',
      registration_enabled: enabled
    });
  } catch (err) {
    console.error('Admin toggle registration error:', err);
    res.status(500).json({ error: '更改系统设置失败。' });
  }
});

// GET /api/admin/settings - Get settings
router.get('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .single();

    const enabled = error ? true : (data?.value !== 'false');

    res.json({ registration_enabled: enabled });
  } catch (err) {
    res.json({ registration_enabled: true }); // Default fallback
  }
});

// GET /api/admin/logs - Fetch transaction logs
router.get('/logs', async (req: AuthenticatedRequest, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('points_history')
      .select(`
        id,
        user_id,
        action,
        points_changed,
        current_points,
        description,
        created_at,
        users ( username )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten user relation to logs
    const flatLogs = logs.map((l: any) => ({
      id: l.id,
      userId: l.user_id,
      username: l.users?.username || '未知用户',
      action: l.action,
      pointsChanged: l.points_changed,
      currentPoints: l.current_points,
      description: l.description,
      createdAt: l.created_at
    }));

    res.json({ logs: flatLogs });
  } catch (err) {
    console.error('Admin get logs error:', err);
    res.status(500).json({ error: '获取流水日志失败。' });
  }
});

export default router;
