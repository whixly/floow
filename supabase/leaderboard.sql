-- Run this in Supabase SQL Editor (re-run to update)
-- Points: 1pt per focus minute, 2pts per completed task, 2pts per habit log

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  user_id      uuid,
  username     text,
  avatar_url   text,
  total_points bigint,
  pom_hours    numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS user_id,
    COALESCE(p.username, split_part(p.email, '@', 1), 'user') AS username,
    p.avatar_url,
    (
      COALESCE(pom.total_mins, 0) +
      COALESCE(hab.cnt, 0) * 2   +
      COALESCE(tsk.cnt, 0) * 2
    ) AS total_points,
    ROUND(COALESCE(pom.total_mins, 0) / 60.0, 1) AS pom_hours
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, SUM(duration_minutes) AS total_mins
    FROM public.pomodoro_sessions
    WHERE session_type = 'work'
    GROUP BY user_id
  ) pom ON pom.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.habit_logs
    GROUP BY user_id
  ) hab ON hab.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
    FROM public.tasks
    WHERE status = 'done'
    GROUP BY user_id
  ) tsk ON tsk.user_id = p.id
  ORDER BY total_points DESC
  LIMIT 31;
$$;

-- Allow all authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon;
