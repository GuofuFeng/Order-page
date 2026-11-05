import express from 'express';
import { supabase } from './supabase.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware.js';
import { detectConflicts, previewReplacement } from './utils/conflictDetector.js';

const router = express.Router();

// GET /api/text-replacements - 获取用户的文字替换规则列表
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  try {
    const { data: replacements, error } = await supabase
      .from('text_replacements')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 转换为前端格式
    const clientReplacements = (replacements || []).map(r => ({
      id: r.id,
      fromText: r.from_text,
      toText: r.to_text,
      enabled: r.enabled,
      createdAt: r.created_at
    }));

    res.json({ replacements: clientReplacements });
  } catch (err) {
    console.error('Fetch text replacements error:', err);
    res.status(500).json({ error: '获取替换规则失败' });
  }
});

// POST /api/text-replacements - 新增替换规则
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { fromText, toText } = req.body;

  if (!fromText || typeof fromText !== 'string' || fromText.trim().length === 0) {
    return res.status(400).json({ error: '原文字不能为空' });
  }

  if (!toText || typeof toText !== 'string' || toText.trim().length === 0) {
    return res.status(400).json({ error: '替换词不能为空' });
  }

  if (fromText.length > 20 || toText.length > 20) {
    return res.status(400).json({ error: '文字长度不能超过20个字符' });
  }

  try {
    // 检查用户已有的替换规则数量
    const { count, error: countError } = await supabase
      .from('text_replacements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) throw countError;

    if ((count || 0) >= 50) {
      return res.status(400).json({ error: '最多只能添加50个替换规则' });
    }

    // 检查是否已存在相同的原文字
    const { data: existingData } = await supabase
      .from('text_replacements')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('from_text', fromText.trim())
      .maybeSingle();

    if (existingData) {
      return res.status(400).json({ error: '该原文字已存在替换规则' });
    }

    // 获取用户现有规则进行冲突检测
    const { data: existingRules } = await supabase
      .from('text_replacements')
      .select('id, from_text, to_text, enabled')
      .eq('user_id', req.user.id);

    const rules = (existingRules || []).map(r => ({
      id: r.id,
      fromText: r.from_text,
      toText: r.to_text,
      enabled: r.enabled
    }));

    // 检测冲突
    const conflictResult = detectConflicts(rules, {
      fromText: fromText.trim(),
      toText: toText.trim()
    });

    // 插入新替换规则
    const newId = `replace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error: insertError } = await supabase
      .from('text_replacements')
      .insert({
        id: newId,
        user_id: req.user.id,
        from_text: fromText.trim(),
        to_text: toText.trim(),
        enabled: true
      });

    if (insertError) throw insertError;

    res.json({
      message: '添加成功',
      replacement: {
        id: newId,
        fromText: fromText.trim(),
        toText: toText.trim(),
        enabled: true,
        createdAt: new Date().toISOString()
      },
      conflicts: conflictResult.conflicts // 返回冲突信息
    });
  } catch (err) {
    console.error('Add text replacement error:', err);
    res.status(500).json({ error: '添加替换规则失败' });
  }
});

// PUT /api/text-replacements/:id - 更新替换规则
router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { id } = req.params;
  const { fromText, toText, enabled } = req.body;

  const updates: any = {};

  if (fromText !== undefined) {
    if (typeof fromText !== 'string' || fromText.trim().length === 0) {
      return res.status(400).json({ error: '原文字不能为空' });
    }
    if (fromText.length > 20) {
      return res.status(400).json({ error: '原文字长度不能超过20个字符' });
    }
    updates.from_text = fromText.trim();
  }

  if (toText !== undefined) {
    if (typeof toText !== 'string' || toText.trim().length === 0) {
      return res.status(400).json({ error: '替换词不能为空' });
    }
    if (toText.length > 20) {
      return res.status(400).json({ error: '替换词长度不能超过20个字符' });
    }
    updates.to_text = toText.trim();
  }

  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: '启用状态必须是布尔值' });
    }
    updates.enabled = enabled;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: '没有要更新的内容' });
  }

  try {
    const { error } = await supabase
      .from('text_replacements')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update text replacement error:', err);
    res.status(500).json({ error: '更新替换规则失败' });
  }
});

// DELETE /api/text-replacements/:id - 删除替换规则
router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('text_replacements')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete text replacement error:', err);
    res.status(500).json({ error: '删除替换规则失败' });
  }
});

// POST /api/text-replacements/check-conflicts - 检测规则冲突
router.post('/check-conflicts', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { fromText, toText, excludeId } = req.body;

  if (!fromText || !toText) {
    return res.status(400).json({ error: '原文字和替换词不能为空' });
  }

  try {
    // 获取用户现有规则
    const { data: existingRules } = await supabase
      .from('text_replacements')
      .select('id, from_text, to_text, enabled')
      .eq('user_id', req.user.id);

    const rules = (existingRules || []).map(r => ({
      id: r.id,
      fromText: r.from_text,
      toText: r.to_text,
      enabled: r.enabled
    }));

    // 检测冲突
    const conflictResult = detectConflicts(rules, {
      fromText,
      toText,
      id: excludeId // 编辑时排除自身
    });

    res.json(conflictResult);
  } catch (err) {
    console.error('Check conflicts error:', err);
    res.status(500).json({ error: '检测冲突失败' });
  }
});

// POST /api/text-replacements/preview - 预览替换效果
router.post('/preview', authenticateJWT, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: '未登录' });

  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '请提供预览文本' });
  }

  try {
    // 获取用户的所有替换规则
    const { data: rules } = await supabase
      .from('text_replacements')
      .select('id, from_text, to_text, enabled, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    const replacementRules = (rules || []).map(r => ({
      id: r.id,
      fromText: r.from_text,
      toText: r.to_text,
      enabled: r.enabled
    }));

    // 预览替换效果
    const preview = previewReplacement(text, replacementRules);

    res.json(preview);
  } catch (err) {
    console.error('Preview replacement error:', err);
    res.status(500).json({ error: '预览替换失败' });
  }
});

export default router;
