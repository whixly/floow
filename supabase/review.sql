-- ============================================================
-- FLOOW — Review Feature (Flashcards + Quiz)
-- Run this in Supabase SQL Editor AFTER schema.sql and update.sql
-- ============================================================

-- Flashcard Decks
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id uuid REFERENCES flashcard_decks ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  difficulty int DEFAULT 0,  -- 0=new, 1=again, 2=good, 3=easy
  next_review timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid REFERENCES quizzes ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_index int NOT NULL,
  explanation text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Quiz Attempts (score history)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid REFERENCES quizzes ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  score int NOT NULL,
  total int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own flashcard decks" ON flashcard_decks;
CREATE POLICY "Users can manage own flashcard decks" ON flashcard_decks
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own flashcards" ON flashcards;
CREATE POLICY "Users can manage own flashcards" ON flashcards
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own quizzes" ON quizzes;
CREATE POLICY "Users can manage own quizzes" ON quizzes
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own quiz questions" ON quiz_questions;
CREATE POLICY "Users can manage own quiz questions" ON quiz_questions
  FOR ALL USING (
    quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (auth.uid() = user_id);
