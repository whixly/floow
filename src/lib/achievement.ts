// ── Achievement notification pub-sub ──────────────────────────
// Call fireAchievement() from anywhere; AchievementToast listens globally.

export type AchievementType = 'task' | 'habit' | 'pomodoro' | 'goal'

export interface Achievement {
  id: string
  message: string
  type: AchievementType
}

const TASK_MESSAGES = [
  "Task crushed! Keep that momentum going!",
  "One more done — you are unstoppable.",
  "Boom! Task complete. What is next?",
  "Done! Small wins add up to big things.",
  "You nailed it! Progress looks good on you.",
  "Task complete! Future you is already grateful.",
  "Another one down. You are on a roll!",
]

const HABIT_MESSAGES = [
  "Habit locked in! That is what consistency looks like.",
  "You showed up for yourself today. That matters.",
  "Streak building! Keep that chain going.",
  "Another habit checked. Future you is proud.",
  "That is discipline in action. Respect.",
  "One rep of your best self. Keep stacking.",
  "Habit done! Tiny actions, massive results.",
]

const POMODORO_MESSAGES = [
  "25 minutes of pure focus! You are on fire!",
  "Session done! Your brain just got stronger.",
  "Focus session complete — that time was yours.",
  "Locked in and finished. Legendary.",
  "Deep work done. That is how champions are built.",
  "Session complete! Consistency beats intensity every time.",
  "Another focused block in the books. Keep going!",
]

const GOAL_MESSAGES = [
  "Goal updated! You are getting closer every day.",
  "Progress tracked! Goals do not complete themselves — you do.",
  "Inch by inch, you are getting there!",
  "Goal progress logged. Every step counts.",
  "You are building something great. Keep pushing.",
]

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getMessage(type: AchievementType): string {
  switch (type) {
    case 'task':     return pick(TASK_MESSAGES)
    case 'habit':    return pick(HABIT_MESSAGES)
    case 'pomodoro': return pick(POMODORO_MESSAGES)
    case 'goal':     return pick(GOAL_MESSAGES)
  }
}

// ── Pub-sub ───────────────────────────────────────────────────
type Listener = (a: Achievement) => void
const listeners = new Set<Listener>()

export function subscribeAchievements(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function fireAchievement(type: AchievementType) {
  const achievement: Achievement = {
    id: `${Date.now()}-${Math.random()}`,
    message: getMessage(type),
    type,
  }
  listeners.forEach(fn => fn(achievement))
}
