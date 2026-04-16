-- ============================================================
-- FLOOW — Auth Fix
-- Run this in Supabase SQL Editor
-- Fixes: username column, login function, and saves username
-- at signup time (bypasses RLS so it works with email confirm)
-- ============================================================

-- 1. Add username column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- 2. Function to look up email by username (used for sign-in)
CREATE OR REPLACE FUNCTION get_email_by_username(uname text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM profiles WHERE lower(username) = lower(uname) LIMIT 1;
$$;

-- 3. Update the auto-create profile trigger to also save username
--    (runs as SECURITY DEFINER so it works before email confirmation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'username'
  )
  ON CONFLICT (id) DO UPDATE
    SET username  = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        email     = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

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
