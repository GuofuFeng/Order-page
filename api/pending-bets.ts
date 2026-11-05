import express from 'express';
import { supabase } from './supabase.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware.js';

const router = express.Router();

/**
 * GET /api/pending-bets
 * Fetch all pending bets for the current user across all baskets
 */
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  try {
    const { data: rows, error } = await supabase
      .from('bets_pending')
      .select('basket_id, content')
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Transform to { A: [...], B: [...], ... }
    const allPendingBets: Record<string, any[]> = {};
    (rows || []).forEach(row => {
      allPendingBets[row.basket_id] = row.content || [];
    });

    res.json({ allPendingBets });
  } catch (err) {
    console.error('Fetch pending bets error:', err);
    res.status(500).json({ error: '获取待确认注单失败' });
  }
});

/**
 * POST /api/pending-bets
 * Save all pending bets for the current user
 * Body: { allPendingBets: { A: [...], B: [...], ... } }
 */
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { allPendingBets } = req.body;

  if (!allPendingBets || typeof allPendingBets !== 'object') {
    return res.status(400).json({ error: '无效的数据格式' });
  }

  try {
    // Upsert each basket (user_id + basket_id is unique)
    const upsertPromises = Object.entries(allPendingBets).map(([basketId, content]) => {
      return supabase
        .from('bets_pending')
        .upsert({
          user_id: req.user!.id,
          basket_id: basketId,
          content: content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,basket_id'
        });
    });

    const results = await Promise.all(upsertPromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('Upsert pending bets errors:', errors);
      throw errors[0].error;
    }

    res.json({ message: '待确认注单已保存' });
  } catch (err) {
    console.error('Save pending bets error:', err);
    res.status(500).json({ error: '保存待确认注单失败' });
  }
});

/**
 * DELETE /api/pending-bets/:basketId
 * Clear pending bets for a specific basket
 */
router.delete('/:basketId', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { basketId } = req.params;

  try {
    const { error } = await supabase
      .from('bets_pending')
      .delete()
      .eq('user_id', req.user.id)
      .eq('basket_id', basketId);

    if (error) throw error;

    res.json({ message: '待确认注单已清空' });
  } catch (err) {
    console.error('Delete pending bets error:', err);
    res.status(500).json({ error: '清空待确认注单失败' });
  }
});

export default router;
