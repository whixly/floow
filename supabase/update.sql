-- ============================================================
-- FLOOW — Update Script
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- ============================================================

-- 1. Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- 2. Function: look up email by username (used for username-based sign-in)
CREATE OR REPLACE FUNCTION get_email_by_username(uname text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE lower(username) = lower(uname) LIMIT 1;
$$;

-- 3. Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for avatars bucket
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their avatar" ON storage.objects;
CREATE POLICY "Users can upload their avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their avatar" ON storage.objects;
CREATE POLICY "Users can update their avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
