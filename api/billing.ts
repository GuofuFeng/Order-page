import express from 'express';
import { supabase } from './supabase.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware.js';

const router = express.Router();

// POST /api/billing/deduct
router.post('/deduct', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录。' });

  const { action } = req.body;
  if (action !== 'import' && action !== 'download') {
    return res.status(400).json({ error: '无效的扣款行为。' });
  }

  const userId = req.user.id;
  const actionLabel = action === 'import' ? '批量导入下单' : '下载Excel注单';

  try {
    // 1. Fetch user's points and monthly card details
    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('points, monthly_card_expires_at')
      .eq('id', userId)
      .single();

    if (fetchErr || !user) {
      return res.status(400).json({ error: '获取用户信息失败。' });
    }

    // 2. Check if the monthly card is active
    let isMonthlyCardActive = false;
    if (user.monthly_card_expires_at) {
      const expiresAt = new Date(user.monthly_card_expires_at).getTime();
      const now = new Date().getTime();
      if (expiresAt > now) {
        isMonthlyCardActive = true;
      }
    }

    // 3. Billing Logic
    if (isMonthlyCardActive) {
      // Monthly card is active. Free of charge!
      // Add transaction history with 0 points
      await supabase.from('points_history').insert({
        user_id: userId,
        action,
        points_changed: 0,
        current_points: user.points,
        description: `月卡特权免费使用【${actionLabel}】`
      });

      return res.json({
        message: '月卡免单成功！',
        points: user.points,
        monthly_card_expires_at: user.monthly_card_expires_at
      });
    }

    // Regular billing (no monthly card)
    const cost = 5;
    if (user.points < cost) {
      return res.status(403).json({
        error: `积分不足。本次【${actionLabel}】需扣除 5 积分，您当前仅剩 ${user.points} 积分，请联系管理员充值或办理月卡。`,
        points: user.points
      });
    }

    const newPoints = user.points - cost;

    // Update user points
    const { error: updateErr } = await supabase
      .from('users')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateErr) {
      throw updateErr;
    }

    // Record billing history
    await supabase.from('points_history').insert({
      user_id: userId,
      action,
      points_changed: -cost,
      current_points: newPoints,
      description: `使用【${actionLabel}】扣除 5 积分`
    });

    return res.json({
      message: `扣除 5 积分成功！`,
      points: newPoints,
      monthly_card_expires_at: user.monthly_card_expires_at
    });

  } catch (err) {
    console.error('Points deduct error:', err);
    res.status(500).json({ error: '计费扣款失败，请稍后再试。' });
  }
});

export default router;
