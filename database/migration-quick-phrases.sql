-- Migration: Create quick_phrases table
-- Description: 创建常用词表，用于存储用户自定义的快捷输入短语
-- Date: 2025-01-XX

-- 创建 quick_phrases 表
CREATE TABLE IF NOT EXISTS quick_phrases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  order_num INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quick_phrases_user ON quick_phrases(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_phrases_order ON quick_phrases(user_id, order_num);

-- 注释
COMMENT ON TABLE quick_phrases IS '用户常用词表';
COMMENT ON COLUMN quick_phrases.id IS '常用词ID';
COMMENT ON COLUMN quick_phrases.user_id IS '用户ID';
COMMENT ON COLUMN quick_phrases.text IS '常用词文本内容';
COMMENT ON COLUMN quick_phrases.order_num IS '排序序号';
COMMENT ON COLUMN quick_phrases.is_system IS '是否为系统预设词';
COMMENT ON COLUMN quick_phrases.created_at IS '创建时间';

-- 完成说明
-- 执行此迁移后，系统预设的常用词（包，连，平，不中）将在应用层通过 API 返回，
-- 无需在数据库中预先插入。用户自定义的常用词将存储在此表中。
