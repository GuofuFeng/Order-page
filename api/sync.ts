import express from 'express';
import { supabase } from './supabase.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware.js';

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

// POST /api/sync/bets - Batch sync bets (智能合并策略，防止数据丢失)
router.post('/bets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { bets, mode = 'merge' } = req.body;
  if (!Array.isArray(bets)) {
    return res.status(400).json({ error: '无效的数据格式。' });
  }

  try {
    // mode='replace': 强制替换所有数据（仅用于数据修复场景，需显式传入）
    // mode='merge': 智能合并（默认），只更新/插入前端传来的数据，不删除其他数据

    if (mode === 'replace') {
      // ⚠️ 危险操作：删除所有现有数据并重新插入
      // 仅在用户明确执行"数据修复"或"完整导入"操作时使用
      console.warn(`[REPLACE MODE] User ${req.user.id} is replacing all bets. Count: ${bets.length}`);

      const { error: deleteErr } = await supabase
        .from('bets')
        .delete()
        .eq('user_id', req.user.id);

      if (deleteErr) throw deleteErr;

      if (bets.length === 0) {
        return res.json({ message: '同步成功(清空)。' });
      }

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

      const { error: insertErr } = await supabase
        .from('bets')
        .insert(dbBets);

      if (insertErr) throw insertErr;

      return res.json({ message: '同步成功(替换模式)！', mode: 'replace' });
    }

    // 默认：安全的合并模式
    // 1. 获取服务器现有的所有注单 ID
    const { data: existingBets, error: fetchErr } = await supabase
      .from('bets')
      .select('id')
      .eq('user_id', req.user.id);

    if (fetchErr) throw fetchErr;

    const existingIds = new Set(existingBets?.map(b => b.id) || []);
    const incomingIds = new Set(bets.map(b => b.id));

    // 2. 分类：需要插入的新注单 vs 需要更新的现有注单
    const toInsert = bets.filter(b => !existingIds.has(b.id));
    const toUpdate = bets.filter(b => existingIds.has(b.id));

    let insertedCount = 0;
    let updatedCount = 0;

    // 3. 批量插入新注单
    if (toInsert.length > 0) {
      const dbBetsInsert = toInsert.map(b => ({
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

      const { error: insertErr } = await supabase
        .from('bets')
        .insert(dbBetsInsert);

      if (insertErr) throw insertErr;
      insertedCount = toInsert.length;
    }

    // 4. 批量更新现有注单（逐条更新，因为 Supabase 不支持批量 upsert with update）
    for (const bet of toUpdate) {
      const { error: updateErr } = await supabase
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

      if (updateErr) {
        console.error(`Failed to update bet ${bet.id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }

    res.json({
      message: '同步成功(合并模式)！',
      mode: 'merge',
      inserted: insertedCount,
      updated: updatedCount,
      total: bets.length
    });
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

// GET /api/sync/presets - Fetch user basket presets
router.get('/presets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `user_presets:${req.user.id}`)
      .maybeSingle();

    if (error) throw error;

    let presets = {};
    if (data && data.value) {
      try {
        presets = JSON.parse(data.value);
      } catch (e) {
        console.error('Failed to parse user presets JSON:', e);
      }
    }

    res.json({ presets });
  } catch (err) {
    console.error('Fetch presets error:', err);
    res.status(500).json({ error: '获取预设失败。' });
  }
});

// POST /api/sync/presets - Save/Upsert user basket presets
router.post('/presets', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { presets } = req.body;
  if (!presets || typeof presets !== 'object') {
    return res.status(400).json({ error: '无效的数据格式。' });
  }

  try {
    console.log('[DEBUG] Saving presets for user', req.user.id, ':', JSON.stringify(presets).substring(0, 200));

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: `user_presets:${req.user.id}`,
        value: JSON.stringify(presets)
      });

    if (error) {
      console.error('[ERROR] Supabase upsert failed:', error);
      throw error;
    }

    console.log('[DEBUG] Presets saved successfully for user', req.user.id);
    res.json({ message: '保存预设成功。' });
  } catch (err) {
    console.error('Save presets error:', err);
    res.status(500).json({ error: '保存预设失败。' });
  }
});

export default router;
