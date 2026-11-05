import express from 'express';
import { supabase } from '../supabase.js';
import { authenticateJWT, AuthenticatedRequest } from '../middleware.js';

const router = express.Router();

// Built-in default phrases shown to every user; not stored in the database
const SYSTEM_PHRASES = [
  { id: 'sys-1', text: '包', order: 1, isSystem: true },
  { id: 'sys-2', text: '连', order: 2, isSystem: true },
  { id: 'sys-3', text: '平', order: 3, isSystem: true },
  { id: 'sys-4', text: '不中', order: 4, isSystem: true }
];

const isSystemPhraseId = (id: string) => SYSTEM_PHRASES.some(p => p.id === id);

// GET /api/quick-phrases - Get all quick phrases for the current user
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  try {
    const { data, error } = await supabase
      .from('quick_phrases')
      .select('*')
      .eq('user_id', req.user.id)
      .order('order_num', { ascending: true });

    if (error) throw error;

    const userPhrases = (data || []).map(p => ({
      id: p.id,
      text: p.text,
      order: p.order_num,
      isSystem: p.is_system || false
    }));

    // Default phrases first, then the user's own
    res.json({ phrases: [...SYSTEM_PHRASES, ...userPhrases] });
  } catch (err: any) {
    console.error('Fetch quick phrases error:', err);
    res.status(500).json({ error: '获取常用词失败' });
  }
});

// POST /api/quick-phrases - Add a new quick phrase
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: '常用词内容不能为空' });
  }

  if (text.length > 100) {
    return res.status(400).json({ error: '常用词长度不能超过 100 个字符' });
  }

  try {
    // Check limit
    const { count } = await supabase
      .from('quick_phrases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_system', false);

    if ((count || 0) >= 50) {
      return res.status(400).json({ error: '最多只能添加 50 个常用词' });
    }

    // Get max order value
    const { data: maxOrderData } = await supabase
      .from('quick_phrases')
      .select('order_num')
      .eq('user_id', req.user.id)
      .order('order_num', { ascending: false })
      .limit(1);

    const maxOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order_num || 0) : 0;

    const newId = `qp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { data: inserted, error } = await supabase
      .from('quick_phrases')
      .insert({
        id: newId,
        user_id: req.user.id,
        text: text.trim(),
        order_num: maxOrder + 1,
        is_system: false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: '添加成功',
      phrase: {
        id: inserted.id,
        text: inserted.text,
        order: inserted.order_num,
        isSystem: inserted.is_system || false
      }
    });
  } catch (err) {
    console.error('Add quick phrase error:', err);
    res.status(500).json({ error: '添加常用词失败' });
  }
});

// PUT /api/quick-phrases/reorder - Reorder user quick phrases
router.put('/reorder', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: '无效的数据格式' });
  }

  try {
    // Update order for each phrase
    const updates = ids.map((id: string, index: number) =>
      supabase
        .from('quick_phrases')
        .update({ order_num: index + 1 })
        .eq('id', id)
        .eq('user_id', req.user!.id)
    );

    await Promise.all(updates);

    res.json({ message: '排序已保存' });
  } catch (err) {
    console.error('Reorder quick phrases error:', err);
    res.status(500).json({ error: '保存排序失败' });
  }
});

// PUT /api/quick-phrases/:id - Update a quick phrase
router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { id } = req.params;
  const { text } = req.body;

  if (isSystemPhraseId(id)) {
    return res.status(403).json({ error: '不能修改系统预设常用词' });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: '常用词内容不能为空' });
  }

  if (text.length > 100) {
    return res.status(400).json({ error: '常用词长度不能超过 100 个字符' });
  }

  try {
    const { error } = await supabase
      .from('quick_phrases')
      .update({ text: text.trim() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .eq('is_system', false);

    if (error) throw error;

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update quick phrase error:', err);
    res.status(500).json({ error: '更新常用词失败' });
  }
});

// DELETE /api/quick-phrases/:id - Delete a quick phrase
router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { id } = req.params;

  if (isSystemPhraseId(id)) {
    return res.status(403).json({ error: '不能删除系统预设常用词' });
  }

  try {
    const { error } = await supabase
      .from('quick_phrases')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .eq('is_system', false);

    if (error) throw error;

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete quick phrase error:', err);
    res.status(500).json({ error: '删除常用词失败' });
  }
});

export default router;
