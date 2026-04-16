export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  accent_color: string
  theme: 'light' | 'dark'
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Notebook {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  notebook_id: string | null
  title: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  color: string
  location: string | null
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly'
  color: string
  streak: number
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null
  progress: number
  status: 'active' | 'completed' | 'paused'
  color: string
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  goal_id: string
  user_id: string
  title: string
  is_completed: boolean
  created_at: string
}

export interface PomodoroSession {
  id: string
  user_id: string
  task_id: string | null
  duration_minutes: number
  session_type: 'work' | 'short_break' | 'long_break'
  completed_at: string
}

export interface FlashcardDeck {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
  card_count?: number
}

export interface Flashcard {
  id: string
  deck_id: string
  user_id: string
  front: string
  back: string
  difficulty: number  // 0=new, 1=again, 2=good, 3=easy
  next_review: string
  created_at: string
}

export interface Quiz {
  id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  question_count?: number
  best_score?: number
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  options: string[]
  correct_index: number
  explanation: string | null
  sort_order: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  score: number
  total: number
  created_at: string
}

// Light theme background colors (vivid)
export const ACCENT_COLORS: Record<string, string> = {
  Red: '#EF4444',
  Green: '#22C55E',
  Blue: '#3B82F6',
  Indigo: '#6366F1',
  Orange: '#F97316',
  Yellow: '#EAB308',
  Violet: '#8B5CF6',
  Grey: '#6B7280',
  Maroon: '#881337',
  Black: '#374151',
  Olive: '#4D7C0F',
  Cyan: '#06B6D4',
  Pink: '#EC4899',
  Magenta: '#D946EF',
  Tan: '#C9A96E',
  Teal: '#14B8A6',
}

// Dark theme background colors (deep/muted versions)
export const DARK_COLORS: Record<string, string> = {
  Red: '#7F1D1D',
  Green: '#14532D',
  Blue: '#1E3A8A',
  Indigo: '#312E81',
  Orange: '#7C2D12',
  Yellow: '#713F12',
  Violet: '#3B0764',
  Grey: '#111827',
  Maroon: '#4C0519',
  Black: '#030712',
  Olive: '#1A2E05',
  Cyan: '#083344',
  Pink: '#500724',
  Magenta: '#4A044E',
  Tan: '#44403C',
  Teal: '#042F2E',
}
