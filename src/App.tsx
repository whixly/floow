import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import LandingPage from './components/landing/LandingPage'
import AuthPage from './components/auth/AuthPage'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './components/dashboard/Dashboard'
import TasksPage from './components/tasks/TasksPage'
import NotesPage from './components/notes/NotesPage'
import SchedulePage from './components/schedule/SchedulePage'
import HabitsPage from './components/habits/HabitsPage'
import PomodoroPage from './components/pomodoro/PomodoroPage'
import GoalsPage from './components/goals/GoalsPage'
import SettingsPage from './components/settings/SettingsPage'
import FlashcardsPage from './components/flashcards/FlashcardsPage'
import QuizPage from './components/quiz/QuizPage'

function App() {
  const { setUser, applyTheme } = useStore()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    applyTheme()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center t-bg">
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — always visible */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth page — redirect to /app if already logged in */}
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/app" replace /> : <AuthPage />}
        />

        {/* Protected app routes */}
        <Route
          path="/app"
          element={isAuthenticated ? <AppLayout /> : <Navigate to="/auth" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="pomodoro" element={<PomodoroPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="flashcards" element={<FlashcardsPage />} />
          <Route path="quiz" element={<QuizPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
