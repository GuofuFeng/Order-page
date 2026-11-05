import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

/**
 * 清理 API 认证中间件
 * 支持两种认证方式：
 * 1. API 令牌（环境变量 CLEANUP_API_TOKEN）
 * 2. 本地/已授权 IP
 */
function cleanupAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const cleanupToken = process.env.CLEANUP_API_TOKEN;
  const authHeader = req.headers.authorization;

  // 方式 1：令牌认证（推荐生产环境）
  if (cleanupToken && authHeader) {
    if (authHeader === `Bearer ${cleanupToken}`) {
      return next();
    } else {
      return res.status(401).json({ error: '无效的 API 令牌' });
    }
  }

  // 方式 2：本地 IP 认证（仅开发环境）
  const clientIP = req.ip || req.socket.remoteAddress || '';
  const isLocalhost = clientIP === '127.0.0.1' || clientIP === 'localhost' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';

  if (isLocalhost) {
    return next();
  }

  // 都不符合，拒绝访问
  res.status(403).json({ error: '未授权的清理请求' });
}

// 应用认证中间件到所有清理路由
router.use(cleanupAuth);

/**
 * POST /api/cleanup/bets
 * 清理超过 30 天的注单（所有用户）
 */
router.post('/bets', async (req, res) => {
  try {
    const daysToKeep = 30;
    const cutoffTimestamp = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    console.log(`[CLEANUP] Starting bets cleanup, cutoff: ${new Date(cutoffTimestamp).toISOString()}`);

    const { data: deletedBets, error } = await supabase
      .from('bets')
      .delete()
      .lt('timestamp', cutoffTimestamp)
      .select('id, user_id, timestamp');

    if (error) throw error;

    const deletedCount = deletedBets?.length || 0;
    console.log(`[CLEANUP] Deleted ${deletedCount} bets older than ${daysToKeep} days`);

    // Group by user for logging
    const byUser: Record<number, number> = {};
    (deletedBets || []).forEach((bet: any) => {
      byUser[bet.user_id] = (byUser[bet.user_id] || 0) + 1;
    });

    res.json({
      success: true,
      message: '注单清理成功',
      deletedCount,
      byUser,
      cutoffDate: new Date(cutoffTimestamp).toISOString()
    });
  } catch (err) {
    console.error('[CLEANUP] Bets cleanup error:', err);
    res.status(500).json({ error: '清理注单失败' });
  }
});

/**
 * POST /api/cleanup/points-history
 * 清理超过 180 天（6 个月）的流水日志
 */
router.post('/points-history', async (req, res) => {
  try {
    const daysToKeep = 180;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    console.log(`[CLEANUP] Starting points_history cleanup, cutoff: ${cutoffDate.toISOString()}`);

    const { data: deletedLogs, error } = await supabase
      .from('points_history')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id, user_id');

    if (error) throw error;

    const deletedCount = deletedLogs?.length || 0;
    console.log(`[CLEANUP] Deleted ${deletedCount} points_history records older than ${daysToKeep} days`);

    // Group by user for logging
    const byUser: Record<number, number> = {};
    (deletedLogs || []).forEach((log: any) => {
      byUser[log.user_id] = (byUser[log.user_id] || 0) + 1;
    });

    res.json({
      success: true,
      message: '流水日志清理成功',
      deletedCount,
      byUser,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (err) {
    console.error('[CLEANUP] Points history cleanup error:', err);
    res.status(500).json({ error: '清理流水日志失败' });
  }
});

/**
 * POST /api/cleanup/run-all
 * 执行所有清理任务（注单 + 流水日志）
 * 定时任务每天凌晨 3 点调用此接口
 */
router.post('/run-all', async (req, res) => {
  try {
    console.log(`[CLEANUP] Starting daily cleanup at ${new Date().toISOString()}`);

    // 1. 清理注单（直接调用逻辑，不走 HTTP，避免 Vercel Serverless 环境中的自调用问题）
    const betsDaysToKeep = 30;
    const betsCutoffTimestamp = Date.now() - betsDaysToKeep * 24 * 60 * 60 * 1000;

    const { data: deletedBets, error: betsError } = await supabase
      .from('bets')
      .delete()
      .lt('timestamp', betsCutoffTimestamp)
      .select('id, user_id, timestamp');

    if (betsError) throw betsError;

    const betsDeletedCount = deletedBets?.length || 0;
    const betsByUser: Record<number, number> = {};
    (deletedBets || []).forEach((bet: any) => {
      betsByUser[bet.user_id] = (betsByUser[bet.user_id] || 0) + 1;
    });

    console.log(`[CLEANUP] Deleted ${betsDeletedCount} bets older than ${betsDaysToKeep} days`);

    // 2. 清理流水日志
    const pointsDaysToKeep = 180;
    const pointsCutoffDate = new Date();
    pointsCutoffDate.setDate(pointsCutoffDate.getDate() - pointsDaysToKeep);

    const { data: deletedLogs, error: pointsError } = await supabase
      .from('points_history')
      .delete()
      .lt('created_at', pointsCutoffDate.toISOString())
      .select('id, user_id');

    if (pointsError) throw pointsError;

    const pointsDeletedCount = deletedLogs?.length || 0;
    const pointsByUser: Record<number, number> = {};
    (deletedLogs || []).forEach((log: any) => {
      pointsByUser[log.user_id] = (pointsByUser[log.user_id] || 0) + 1;
    });

    console.log(`[CLEANUP] Deleted ${pointsDeletedCount} points_history records older than ${pointsDaysToKeep} days`);
    console.log('[CLEANUP] Daily cleanup completed');

    res.json({
      success: true,
      message: '每日清理任务完成',
      bets: {
        success: true,
        deletedCount: betsDeletedCount,
        byUser: betsByUser,
        cutoffDate: new Date(betsCutoffTimestamp).toISOString()
      },
      pointsHistory: {
        success: true,
        deletedCount: pointsDeletedCount,
        byUser: pointsByUser,
        cutoffDate: pointsCutoffDate.toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CLEANUP] Daily cleanup error:', err);
    res.status(500).json({ error: '每日清理任务失败' });
  }
});

/**
 * GET /api/cleanup/stats
 * 查询可清理的数据统计（不执行清理）
 * 需要登录用户
 */
router.get('/stats', async (req, res) => {
  try {
    // 统计超过 30 天的注单
    const betsCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const { count: oldBetsCount } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true })
      .lt('timestamp', betsCutoff);

    // 统计超过 180 天的流水日志
    const pointsCutoff = new Date();
    pointsCutoff.setDate(pointsCutoff.getDate() - 180);
    const { count: oldPointsCount } = await supabase
      .from('points_history')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', pointsCutoff.toISOString());

    // 统计总数
    const { count: totalBets } = await supabase
      .from('bets')
      .select('*', { count: 'exact', head: true });

    const { count: totalPoints } = await supabase
      .from('points_history')
      .select('*', { count: 'exact', head: true });

    res.json({
      bets: {
        total: totalBets || 0,
        oldCount: oldBetsCount || 0,
        retentionDays: 30
      },
      pointsHistory: {
        total: totalPoints || 0,
        oldCount: oldPointsCount || 0,
        retentionDays: 180
      }
    });
  } catch (err) {
    console.error('[CLEANUP] Stats error:', err);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

export default router;
