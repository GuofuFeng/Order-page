import express from 'express';
import { supabase } from './supabase';
import { authenticateJWT, AuthenticatedRequest } from './middleware';

const router = express.Router();

// GET /api/sync/bets - Get all bets for the logged-in user
router.get('/bets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  try {
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Convert SQL rows to client-side ConfirmedBet objects.
    // In React frontend: ConfirmedBet has properties like basketId, lotteryType, etc.
    const clientBets = bets.map(b => ({
      id: b.id,
      basketId: b.basket_id,
      lotteryType: b.lottery_type,
      content: b.content,
      total: b.total,
      timestamp: parseInt(b.timestamp),
      items: typeof b.items === 'string' ? JSON.parse(b.items) : b.items,
      manualWinType: b.manual_win_type || undefined,
      manualWinAmount: b.manual_win_amount !== null ? b.manual_win_amount : undefined,
      frozenWinAmount: b.frozen_win_amount !== null ? b.frozen_win_amount : undefined,
      frozenWinType: b.frozen_win_type || undefined,
      isFrozen: b.is_frozen === 1,
    }));

    res.json({ bets: clientBets });
  } catch (err) {
    console.error('Fetch bets sync error:', err);
    res.status(500).json({ error: '获取同步注单失败。' });
  }
});

// POST /api/sync/bets - Batch sync bets (e.g., merging/syncing local state with cloud)
router.post('/bets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { bets } = req.body;
  if (!Array.isArray(bets)) {
    return res.status(400).json({ error: '无效的数据格式。' });
  }

  try {
    // 1. Delete all existing bets for the user
    const { error: deleteErr } = await supabase
      .from('bets')
      .delete()
      .eq('user_id', req.user.id);

    if (deleteErr) throw deleteErr;

    if (bets.length === 0) {
      return res.json({ message: '同步成功(清空)。' });
    }

    // 2. Map frontend ConfirmedBet[] into database insert structure
    const dbBets = bets.map(b => ({
      id: b.id,
      user_id: req.user!.id,
      basket_id: b.basketId,
      lottery_type: b.lotteryType,
      content: b.content,
      total: b.total,
      timestamp: b.timestamp,
      items: JSON.stringify(b.items),
      manual_win_type: b.manualWinType || null,
      manual_win_amount: b.manualWinAmount !== undefined ? b.manualWinAmount : null,
      frozen_win_amount: b.frozenWinAmount !== undefined ? b.frozenWinAmount : null,
      frozen_win_type: b.frozenWinType || null,
      is_frozen: b.isFrozen ? 1 : 0
    }));

    // 3. Batch insert
    const { error: insertErr } = await supabase
      .from('bets')
      .insert(dbBets);

    if (insertErr) throw insertErr;

    res.json({ message: '同步成功！' });
  } catch (err) {
    console.error('Batch sync bets error:', err);
    res.status(500).json({ error: '同步注单数据失败。' });
  }
});

// POST /api/sync/bet/add - Add single bet
router.post('/bet/add', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { bet } = req.body;
  if (!bet || !bet.id) {
    return res.status(400).json({ error: '无效的数据。' });
  }

  try {
    const { error } = await supabase
      .from('bets')
      .insert({
        id: bet.id,
        user_id: req.user.id,
        basket_id: bet.basketId,
        lottery_type: bet.lotteryType,
        content: bet.content,
        total: bet.total,
        timestamp: bet.timestamp,
        items: JSON.stringify(bet.items),
        manual_win_type: bet.manualWinType || null,
        manual_win_amount: bet.manualWinAmount !== undefined ? bet.manualWinAmount : null,
        frozen_win_amount: bet.frozenWinAmount !== undefined ? bet.frozenWinAmount : null,
        frozen_win_type: bet.frozenWinType || null,
        is_frozen: bet.isFrozen ? 1 : 0
      });

    if (error) throw error;
    res.json({ message: '保存成功。' });
  } catch (err) {
    console.error('Add bet error:', err);
    res.status(500).json({ error: '保存注单失败。' });
  }
});

// POST /api/sync/bet/update - Update single bet
router.post('/bet/update', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { bet } = req.body;
  if (!bet || !bet.id) {
    return res.status(400).json({ error: '无效的数据。' });
  }

  try {
    const { error } = await supabase
      .from('bets')
      .update({
        basket_id: bet.basketId,
        lottery_type: bet.lotteryType,
        content: bet.content,
        total: bet.total,
        timestamp: bet.timestamp,
        items: JSON.stringify(bet.items),
        manual_win_type: bet.manualWinType || null,
        manual_win_amount: bet.manualWinAmount !== undefined ? bet.manualWinAmount : null,
        frozen_win_amount: bet.frozenWinAmount !== undefined ? bet.frozenWinAmount : null,
        frozen_win_type: bet.frozenWinType || null,
        is_frozen: bet.isFrozen ? 1 : 0
      })
      .eq('id', bet.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: '更新成功。' });
  } catch (err) {
    console.error('Update bet error:', err);
    res.status(500).json({ error: '更新注单失败。' });
  }
});

// DELETE /api/sync/bet/delete - Delete single bet or array of bets
router.delete('/bet/delete', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { id, ids } = req.body;

  try {
    let query = supabase.from('bets').delete().eq('user_id', req.user.id);

    if (ids && Array.isArray(ids)) {
      query = query.in('id', ids);
    } else if (id) {
      query = query.eq('id', id);
    } else {
      return res.status(400).json({ error: '请提供需要删除的注单 ID。' });
    }

    const { error } = await query;
    if (error) throw error;

    res.json({ message: '删除成功。' });
  } catch (err) {
    console.error('Delete bet error:', err);
    res.status(500).json({ error: '删除注单失败。' });
  }
});

export default router;
