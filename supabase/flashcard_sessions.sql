-- ============================================================
-- FLOOW — Flashcard Sessions Tracking
-- Run this in Supabase SQL Editor AFTER review.sql
-- Needed for leaderboard: 5pts per completed flashcard session
-- ============================================================

CREATE TABLE IF NOT EXISTS flashcard_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES flashcard_decks ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  cards_reviewed int NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own flashcard sessions" ON flashcard_sessions;
CREATE POLICY "Users can manage own flashcard sessions" ON flashcard_sessions
  FOR ALL USING (auth.uid() = user_id);
