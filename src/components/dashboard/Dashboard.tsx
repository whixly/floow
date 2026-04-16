import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format, addMonths, subMonths
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { Task, CalendarEvent, Habit, Goal, Note } from '../../types'

export default function Dashboard() {
  const { user } = useStore()
  const navigate = useNavigate()

  const [tasks,         setTasks]         = useState<Task[]>([])
  const [events,        setEvents]        = useState<CalendarEvent[]>([])
  const [habits,        setHabits]        = useState<Habit[]>([])
  const [goals,         setGoals]         = useState<Goal[]>([])
  const [notes,         setNotes]         = useState<Note[]>([])
  const [pomodoroCount, setPomodoroCount] = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [calMonth,      setCalMonth]      = useState(new Date())

  const today    = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Calendar grid
  const monthStart = startOfMonth(calMonth)
  const monthEnd   = endOfMonth(calMonth)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd,   { weekStartsOn: 1 })
  const calDays    = eachDayOfInterval({ start: gridStart, end: gridEnd })

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [t, e, h, g, n, p] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(6),
        supabase.from('events').select('*').eq('user_id', user.id).order('start_time'),
        supabase.from('habits').select('*').eq('user_id', user.id).limit(8),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').limit(5),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('pomodoro_sessions').select('id').eq('user_id', user.id).eq('session_type', 'work').gte('completed_at', `${todayStr}T00:00:00`),
      ])
      setTasks(t.data ?? [])
      setEvents(e.data ?? [])
      setHabits(h.data ?? [])
      setGoals(g.data ?? [])
      setNotes(n.data ?? [])
      setPomodoroCount(p.data?.length ?? 0)
      setLoading(false)
    }
    load()
  }, [user])

  const priorityDot: Record<string, string> = {
    urgent: 'bg-red-400', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-400',
  }

  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start_time), day))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="fade-in grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 7rem)' }}>

      {/* ── LEFT COLUMN: Task + Notes ── */}
      <div className="col-span-12 lg:col-span-3 grid grid-rows-2 gap-4">

        {/* TASK */}
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Task</span>
            <Link to="/app/tasks" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-4">No pending tasks</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto flex-1">
              {tasks.map(task => (
                <li key={task.id}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 rounded-lg px-1 transition"
                  onClick={() => navigate('/app/tasks')}>
                  <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${priorityDot[task.priority]}`} />
                  <span className="text-sm t-ct truncate flex-1">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* NOTES */}
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Notes</span>
            <Link to="/app/notes" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>
          {notes.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-4">No notes yet</p>
          ) : (
            <ul className="space-y-2 overflow-y-auto flex-1">
              {notes.map(note => (
                <li key={note.id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-white/5 rounded-lg px-1 py-0.5 transition"
                  onClick={() => navigate('/app/notes')}>
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium t-ct truncate">{note.title}</p>
                    {note.content && (
                      <p className="text-xs t-ct-3 truncate opacity-70">
                        {note.content.replace(/[#*`>]/g, '').slice(0, 50)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── CENTER COLUMN: Calendar ── */}
      <div className="col-span-12 lg:col-span-5 t-card rounded-2xl border p-5 flex flex-col gap-4">
        {/* Month header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setCalMonth(m => subMonths(m, 1))}
            className="text-white/50 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-white tracking-wide">
            {format(calMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCalMonth(m => addMonths(m, 1))}
            className="text-white/50 hover:text-white transition p-1 rounded-lg hover:bg-white/10">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-xs font-bold t-ct-3 pb-2">{d}</span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1 flex-1">
          {calDays.map(day => {
            const isToday   = isSameDay(day, today)
            const inMonth   = isSameMonth(day, calMonth)
            const dayEvents = eventsOnDay(day)
            return (
              <div key={day.toISOString()}
                className="flex flex-col items-center gap-0.5 cursor-pointer group"
                onClick={() => navigate('/app/schedule')}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition
                  ${isToday
                    ? 'bg-white/90 text-[var(--theme-bg)] font-black'
                    : inMonth
                      ? 't-ct group-hover:bg-white/10'
                      : 't-ct-3 opacity-30'
                  }`}>
                  {format(day, 'd')}
                </div>
                {/* Event dots */}
                <div className="flex gap-0.5 justify-center h-1.5">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-white/60" />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Today's events */}
        <div className="border-t border-white/10 pt-3 space-y-1.5">
          <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Today</span>
          {eventsOnDay(today).length === 0 ? (
            <p className="text-xs t-ct-3">No events today</p>
          ) : (
            eventsOnDay(today).slice(0, 3).map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-xs">
                <span className="w-1 h-3 rounded-full bg-white/50 flex-shrink-0" />
                <span className="t-ct truncate flex-1">{ev.title}</span>
                <span className="t-ct-3 flex-shrink-0">{format(new Date(ev.start_time), 'h:mm a')}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT COLUMN: Habit Tracker + Goal circle + Pomodoro circle ── */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

        {/* HABIT TRACKER */}
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Habit Tracker</span>
            <Link to="/app/habits" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-3">No habits yet</p>
          ) : (
            <div className="space-y-2.5">
              {habits.slice(0, 5).map(habit => (
                <div key={habit.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium t-ct truncate flex-1">{habit.name}</span>
                    <span className="text-xs t-ct-3 ml-2 flex-shrink-0">{habit.streak}d</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i}
                        className={`flex-1 h-2 rounded-sm transition-all ${
                          i < Math.min(habit.streak, 7) ? 'bg-white/75' : 'bg-white/12'
                        }`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GOAL STATISTIC — circle */}
        <div className="flex justify-center">
          <div
            className="t-card border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/20 transition"
            style={{ width: '160px', height: '160px', borderRadius: '50%' }}
            onClick={() => navigate('/app/goals')}>
            <span className="text-3xl font-black text-white">{goals.length}</span>
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest text-center leading-tight">
              Goal<br />Statistic
            </span>
            {goals.length > 0 && (
              <span className="text-xs t-ct-3">
                {Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)}% avg
              </span>
            )}
          </div>
        </div>

        {/* POMODORO — circle */}
        <div className="flex justify-center">
          <div
            className="t-card border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/20 transition"
            style={{ width: '160px', height: '160px', borderRadius: '50%' }}
            onClick={() => navigate('/app/pomodoro')}>
            {/* Ring progress */}
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="5"
                  strokeDasharray={`${Math.min(pomodoroCount, 8) / 8 * 163.4} 163.4`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-white">{pomodoroCount}</span>
              </div>
            </div>
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Pomodoro</span>
          </div>
        </div>

      </div>
    </div>
  )
}
