-- Create text_replacements table for storing user-defined text replacement rules
CREATE TABLE IF NOT EXISTS text_replacements (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  from_text TEXT NOT NULL,
  to_text TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_text_replacements_user_id ON text_replacements(user_id);

-- Create index on user_id + enabled for filtering active rules
CREATE INDEX IF NOT EXISTS idx_text_replacements_user_enabled ON text_replacements(user_id, enabled) WHERE enabled = true;

-- Create unique constraint to prevent duplicate from_text per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_text_replacements_user_from_text ON text_replacements(user_id, from_text);
