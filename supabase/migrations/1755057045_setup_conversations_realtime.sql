-- Migration: setup_conversations_realtime
-- Created at: 1755057045

-- Enable RLS on conversations table for realtime
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to conversations for realtime updates
CREATE POLICY "Allow public read conversations" ON conversations
  FOR SELECT USING (true);

-- Allow public insert conversations
CREATE POLICY "Allow public insert conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Enable realtime for conversations table
ALTER publication supabase_realtime ADD TABLE conversations;;