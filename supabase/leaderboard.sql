-- Run this in Supabase SQL Editor (re-run to update if already exists)
-- Points: completed task = 10pts, habit log = 5pts, pomodoro work session = 25pts
-- The SECURITY DEFINER + grants below allow ALL authenticated users to see everyone's data

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
      COALESCE(pom.cnt, 0) * 25 +
      COALESCE(hab.cnt, 0) * 5  +
      COALESCE(tsk.cnt, 0) * 10
    ) AS total_points,
    ROUND(COALESCE(pom.cnt, 0) * 25.0 / 60, 1) AS pom_hours
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt
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

-- Allow all authenticated users to call this function (sees everyone's data)
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon;
