#!/usr/bin/env node

/**
 * 每日自动清理脚本
 *
 * 用途：清理超过 30 天的注单和超过 180 天的流水日志
 * 调用方式：
 *   1. 手动执行：node scripts/daily-cleanup.mjs
 *   2. 定时任务：配置系统 cron 每天凌晨 3 点执行
 *   3. 本地服务器：http://localhost:3001/api/cleanup/run-all
 *   4. Vercel 部署：https://your-domain.com/api/cleanup/run-all
 *
 * 支持环境变量：
 *   - CLEANUP_API_URL：清理 API 的完整 URL（默认 http://localhost:3001）
 *   - CLEANUP_API_TOKEN：API 认证令牌（可选，如需安全认证）
 *
 * Windows 定时任务配置示例：
 *   任务计划程序 → 创建基本任务 → 触发器：每天凌晨 3:00
 *   操作：启动程序
 *   程序：node
 *   参数：G:\Order\scripts\daily-cleanup.mjs
 *   起始于：G:\Order
 *
 * Linux/Mac cron 配置示例：
 *   crontab -e
 *   添加：0 3 * * * cd /path/to/Order && node scripts/daily-cleanup.mjs >> logs/cleanup.log 2>&1
 */

import 'dotenv/config';

// 支持三种 API 调用方式
const API_URL = process.env.CLEANUP_API_URL || 'http://localhost:3001';
const API_TOKEN = process.env.CLEANUP_API_TOKEN; // 可选的认证令牌

async function runCleanup() {
  console.log(`[${new Date().toISOString()}] Starting daily cleanup...`);
  console.log(`[${new Date().toISOString()}] Using API URL: ${API_URL}`);

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    // 如果配置了 API 令牌，添加认证头
    if (API_TOKEN) {
      headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }

    const response = await fetch(`${API_URL}/api/cleanup/run-all`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('[SUCCESS] Cleanup completed:');
    console.log(`  - Bets deleted: ${result.bets?.deletedCount || 0}`);
    console.log(`  - Points history deleted: ${result.pointsHistory?.deletedCount || 0}`);

    if (result.bets?.byUser) {
      console.log('  - Bets by user:', result.bets.byUser);
    }

    console.log(`[${new Date().toISOString()}] Cleanup finished successfully`);
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Cleanup failed:', error.message);
    process.exit(1);
  }
}

runCleanup();
