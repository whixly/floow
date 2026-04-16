-- Run this in Supabase SQL Editor
-- Creates a leaderboard function that aggregates focus sessions per user

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  user_id   uuid,
  username  text,
  avatar_url text,
  session_count bigint,
  total_hours   numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id                                          AS user_id,
    COALESCE(p.username, split_part(p.email, '@', 1), 'user') AS username,
    p.avatar_url,
    COUNT(ps.id)                                  AS session_count,
    ROUND(COUNT(ps.id) * 25.0 / 60, 1)           AS total_hours
  FROM public.profiles p
  LEFT JOIN public.pomodoro_sessions ps
    ON ps.user_id = p.id AND ps.session_type = 'work'
  GROUP BY p.id, p.username, p.email, p.avatar_url
  ORDER BY session_count DESC
  LIMIT 31;
$$;
