import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format,
  addMonths, subMonths, subDays
} from 'date-fns'
import { ChevronLeft, ChevronRight, Play, Pause, Square, Coffee, X, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { Task, CalendarEvent, Habit, Goal, Note, HabitLog } from '../../types'
import { ACCENT_COLORS } from '../../types'
import { fireAchievement } from '../../lib/achievement'
import { playPomSound, unlockAudio } from '../../lib/pomSound'

// ── Pie chart helpers ─────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
function slicePath(cx: number, cy: number, ro: number, ri: number, a1: number, a2: number) {
  const os = polar(cx, cy, ro, a1), oe = polar(cx, cy, ro, a2)
  const is = polar(cx, cy, ri, a2), ie = polar(cx, cy, ri, a1)
  const lg = a2 - a1 > 180 ? 1 : 0
  return `M${os.x} ${os.y} A${ro} ${ro} 0 ${lg} 1 ${oe.x} ${oe.y} L${is.x} ${is.y} A${ri} ${ri} 0 ${lg} 0 ${ie.x} ${ie.y}Z`
}

// ── Colors for goals ──────────────────────────────────────────
const PIE_FALLBACK = ['#86efac','#6ee7b7','#67e8f9','#a5b4fc','#fca5a5','#fcd34d','#c4b5fd','#fb923c']

// ── Rank badge colors ─────────────────────────────────────────
const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

// ── Motivational messages ─────────────────────────────────────
const MOTIVATIONS = [
  "You showed up today. That already puts you ahead.",
  "Every focused session moves you closer to your goals.",
  "Small consistent actions create extraordinary results.",
  "Progress, not perfection. You are doing great.",
  "One habit at a time builds the life you want.",
  "Your future self is cheering you on. Keep going!",
  "The best time to start was yesterday. The next best time is now.",
  "Track it, do it, own it. You have got this.",
  "Discipline is choosing what you want most over what you want now.",
  "Consistency is the bridge between goals and accomplishments.",
  "Every expert was once a beginner. Keep building.",
  "Focus is your superpower. Use it well today.",
  "You are not behind. You are exactly where you need to be.",
  "Each task you complete is a promise kept to yourself.",
  "Momentum starts with one small action. Go.",
]

interface LeaderboardEntry {
  user_id: string
  username: string
  avatar_url: string | null
  total_points: number
  pom_hours: number
}

export default function Dashboard() {
  const {
    user,
    pomMode, pomRunning, getPomTime, pomCustomMins,
    togglePom, switchPomMode, stopPom, completePomCycle,
  } = useStore()
  const navigate = useNavigate()

  // Data
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
  const [habits,      setHabits]      = useState<Habit[]>([])
  const [habitLogs,   setHabitLogs]   = useState<HabitLog[]>([])
  const [goals,       setGoals]       = useState<Goal[]>([])
  const [notes,       setNotes]       = useState<Note[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [lbError,     setLbError]     = useState(false)
  const [lbExpanded,  setLbExpanded]  = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [pomSessions, setPomSessions] = useState(0)

  // Motivational banner
  const [motiveIdx,  setMotiveIdx]  = useState(() => Math.floor(Math.random() * MOTIVATIONS.length))
  const [showMotive, setShowMotive] = useState(true)

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date())

  // Tick counter — forces re-render while timer is running
  const [, setTick] = useState(0)

  const today    = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Calendar grid
  const monthStart = startOfMonth(calMonth)
  const gridStart  = startOfWeek(monthStart,       { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 })
  const calDays    = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Habit grid — last 21 days (fits the column width)
  const GRID_DAYS = 21
  const gridDates = Array.from({ length: GRID_DAYS }, (_, i) =>
    format(subDays(today, GRID_DAYS - 1 - i), 'yyyy-MM-dd')
  )

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const since = format(subDays(today, GRID_DAYS - 1), 'yyyy-MM-dd')
      const [t, e, h, hl, g, n, p, lb] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(6),
        supabase.from('events').select('*').eq('user_id', user.id).order('start_time'),
        supabase.from('habits').select('*').eq('user_id', user.id).limit(8),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('completed_date', since),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').limit(6),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('pomodoro_sessions').select('id').eq('user_id', user.id).eq('session_type', 'work').gte('completed_at', `${todayStr}T00:00:00`),
        supabase.rpc('get_leaderboard'),
      ])
      setTasks(t.data ?? [])
      setEvents(e.data ?? [])
      setHabits(h.data ?? [])
      setHabitLogs(hl.data ?? [])
      setGoals(g.data ?? [])
      setNotes(n.data ?? [])
      setPomSessions(p.data?.length ?? 0)
      if (lb.error) { console.error('Leaderboard RPC error:', lb.error); setLbError(true) }
      else setLeaderboard((lb.data as LeaderboardEntry[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  // ── Pomodoro tick — re-renders display and detects completion ─
  useEffect(() => {
    if (!pomRunning) return
    const id = setInterval(() => {
      const t = getPomTime()
      setTick(n => n + 1)
      if (t <= 0) {
        if (pomMode === 'work') {
          setPomSessions(s => s + 1)
          supabase.from('pomodoro_sessions').insert({ user_id: user?.id, session_type: 'work' })
          fireAchievement('pomodoro')
        }
        playPomSound(pomMode)
        completePomCycle()
      }
    }, 500)
    return () => clearInterval(id)
  }, [pomRunning, pomMode])

  // ── Helpers ───────────────────────────────────────────────
  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start_time), day))
  const isHabitDone = (hid: string, d: string) => habitLogs.some(l => l.habit_id === hid && l.completed_date === d)

  const priorityDot: Record<string, string> = {
    urgent: 'bg-red-400', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-400',
  }

  // ── Pie chart data ─────────────────────────────────────────
  const totalProgress = goals.reduce((s, g) => s + g.progress, 0) || 1
  let pieAngle = 0
  const pieSlices = goals.map((g, i) => {
    const sweep = (g.progress / totalProgress) * 360 || (360 / Math.max(goals.length, 1))
    const path = goals.length === 1
      ? slicePath(90, 90, 80, 45, 0, 359.99)
      : slicePath(90, 90, 80, 45, pieAngle, pieAngle + sweep)
    pieAngle += sweep
    return { ...g, path, color: ACCENT_COLORS[g.color] || PIE_FALLBACK[i % PIE_FALLBACK.length] }
  })

  // ── Pomodoro clock face (derived from store) ──────────────
  const pomTime     = Math.ceil(getPomTime())
  const pomProgress = 1 - pomTime / (pomCustomMins[pomMode] * 60)
  const pomMins     = Math.floor(pomTime / 60)
  const pomSecs     = pomTime % 60

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="fade-in grid grid-cols-12 gap-4 items-stretch" style={{ minHeight: 'calc(100vh - 7rem)' }}>

      {/* ── Motivational Banner ───────────────────────────── */}
      {showMotive && (
        <div className="col-span-12 flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.25)' }}>
          <span className="text-sm t-ct flex-1 leading-snug">
            {MOTIVATIONS[motiveIdx]}
          </span>
          <button
            onClick={() => setMotiveIdx(i => (i + 1) % MOTIVATIONS.length)}
            className="text-white/30 hover:text-white/70 transition flex-shrink-0"
            title="Next message"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowMotive(false)}
            className="text-white/30 hover:text-white/70 transition flex-shrink-0"
            title="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── LEFT: Task + Notes ───────────────────────────── */}
      <div className="col-span-12 lg:col-span-3 grid grid-rows-2 gap-4">

        <div className="t-card rounded-2xl border p-4 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Task</span>
            <Link to="/app/tasks" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>
          {tasks.length === 0
            ? <p className="text-sm t-ct-3 text-center py-4">No pending tasks</p>
            : <ul className="space-y-1.5 overflow-y-auto flex-1">
                {tasks.map(t => (
                  <li key={t.id} className="flex items-center gap-2 py-1 px-1 hover:bg-white/5 rounded-lg transition cursor-pointer" onClick={() => navigate('/app/tasks')}>
                    <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${priorityDot[t.priority]}`} />
                    <span className="text-sm t-ct truncate">{t.title}</span>
                  </li>
                ))}
              </ul>
          }
        </div>

        <div className="t-card rounded-2xl border p-4 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Notes</span>
            <Link to="/app/notes" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>
          {notes.length === 0
            ? <p className="text-sm t-ct-3 text-center py-4">No notes yet</p>
            : <ul className="space-y-1.5 overflow-y-auto flex-1">
                {notes.map(n => (
                  <li key={n.id} className="flex items-start gap-2 px-1 py-0.5 hover:bg-white/5 rounded-lg transition cursor-pointer" onClick={() => navigate('/app/notes')}>
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium t-ct truncate">{n.title}</p>
                      {n.content && <p className="text-xs t-ct-3 truncate opacity-70">{n.content.replace(/[#*`>]/g,'').slice(0,50)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
          }
        </div>
      </div>

      {/* ── CENTER: Calendar ─────────────────────────────── */}
      <div className="col-span-12 lg:col-span-5 t-card rounded-2xl border p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="text-white/50 hover:text-white transition p-1 rounded-lg hover:bg-white/10"><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold text-white tracking-wide">{format(calMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="text-white/50 hover:text-white transition p-1 rounded-lg hover:bg-white/10"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {['M','T','W','T','F','S','S'].map((d,i) => <span key={i} className="text-xs font-bold t-ct-3 pb-1">{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1 flex-1">
          {calDays.map(day => {
            const isToday = isSameDay(day, today)
            const inMonth = isSameMonth(day, calMonth)
            const dots    = eventsOnDay(day)
            return (
              <div key={day.toISOString()} className="flex flex-col items-center gap-0.5 cursor-pointer group" onClick={() => navigate('/app/schedule')}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition
                  ${isToday ? 'bg-white/90 text-[var(--theme-bg)] font-black' : inMonth ? 't-ct group-hover:bg-white/10' : 't-ct-3 opacity-30'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex gap-0.5 h-1.5 justify-center">
                  {dots.slice(0,3).map((_,i) => <span key={i} className="w-1 h-1 rounded-full bg-white/60" />)}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-white/10 pt-3 space-y-1.5">
          <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Today</span>
          {eventsOnDay(today).length === 0
            ? <p className="text-xs t-ct-3">No events today</p>
            : eventsOnDay(today).slice(0,3).map(ev => (
                <div key={ev.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1 h-3 rounded-full bg-white/50 flex-shrink-0" />
                  <span className="t-ct truncate flex-1">{ev.title}</span>
                  <span className="t-ct-3 flex-shrink-0">{format(new Date(ev.start_time),'h:mm a')}</span>
                </div>
              ))
          }
        </div>
      </div>

      {/* ── RIGHT: Habit Tracker + Goal Pie + Pomodoro Clock ─ */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 h-full">

        {/* HABIT TRACKER — HabitKit grid */}
        <div className="t-card rounded-2xl border p-4 flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Habit Tracker</span>
            <Link to="/app/habits" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>

          {habits.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-3">No habits yet</p>
          ) : (
            <div className="space-y-1.5 overflow-hidden">
              {/* Day labels aligned with grid */}
              <div className="flex items-end gap-2">
                <span className="flex-shrink-0" style={{ width: 64 }} />
                <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${GRID_DAYS}, 1fr)` }}>
                  {gridDates.map((d, i) => (
                    <div key={d} className="overflow-hidden text-center">
                      {i % 7 === 0 && (
                        <span className="text-[8px] t-ct-3 block leading-none">{format(new Date(d),'d')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {/* Habit rows — fill full width */}
              {habits.slice(0, 6).map(habit => {
                const color = ACCENT_COLORS[habit.color] || '#22c55e'
                return (
                  <div key={habit.id} className="flex items-center gap-2">
                    <span
                      className="text-[11px] t-ct truncate text-right flex-shrink-0 leading-none"
                      style={{ width: 62 }}
                    >
                      {habit.name}
                    </span>
                    <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${GRID_DAYS}, 1fr)` }}>
                      {gridDates.map(d => (
                        <div key={d}
                          title={d}
                          className="rounded-[2px]"
                          style={{
                            aspectRatio: '1',
                            backgroundColor: isHabitDone(habit.id, d) ? color : 'rgba(255,255,255,0.09)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* GOAL PIE CHART */}
        <div className="t-card rounded-2xl border p-4 flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Goals</span>
            <Link to="/app/goals" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>

          {goals.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-6">No active goals</p>
          ) : (
            <div className="flex items-center gap-4 flex-1">
              {/* Pie SVG */}
              <svg viewBox="0 0 180 180" className="w-[130px] h-[130px] flex-shrink-0">
                {pieSlices.map((s) => (
                  <path key={s.id} d={s.path} fill={s.color} opacity={0.85}
                    className="hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => navigate('/app/goals')}>
                    <title>{s.title} — {s.progress}%</title>
                  </path>
                ))}
                <circle cx="90" cy="90" r="44" fill="var(--card-bg)" />
                <text x="90" y="86" textAnchor="middle" style={{ fill: 'var(--card-text)', fontSize: 20, fontWeight: 700, fontFamily: 'Consolas' }}>
                  {goals.length}
                </text>
                <text x="90" y="102" textAnchor="middle" style={{ fill: 'var(--card-text-3)', fontSize: 9, fontFamily: 'Consolas' }}>
                  GOALS
                </text>
              </svg>
              {/* Legend */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pieSlices.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs t-ct truncate flex-1">{s.title}</span>
                    <span className="text-xs t-ct-3 flex-shrink-0">{s.progress}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* POMODORO CLOCK */}
        <div className="t-card rounded-2xl border p-4 flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Pomodoro</span>
            <span className="text-xs t-ct-3">{pomSessions} sessions today</span>
          </div>

          <div className="flex items-center gap-4 flex-1">
            {/* Clock face */}
            <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
              <svg viewBox="0 0 160 160" className="w-full h-full">
                <circle cx="80" cy="80" r="74" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i * 30 - 90) * Math.PI / 180
                  const r1 = 64, r2 = i % 3 === 0 ? 56 : 60
                  return (
                    <line key={i}
                      x1={80 + r1 * Math.cos(a)} y1={80 + r1 * Math.sin(a)}
                      x2={80 + r2 * Math.cos(a)} y2={80 + r2 * Math.sin(a)}
                      stroke="rgba(255,255,255,0.25)" strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round" />
                  )
                })}
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="80" cy="80" r="72" fill="none"
                  stroke={pomMode === 'work' ? 'rgba(134,239,172,0.85)' : 'rgba(147,197,253,0.85)'}
                  strokeWidth="8"
                  strokeDasharray={`${pomProgress * 2 * Math.PI * 72} ${2 * Math.PI * 72}`}
                  strokeDashoffset={2 * Math.PI * 72 * 0.25}
                  strokeLinecap="round"
                  style={{ transition: pomRunning ? 'stroke-dasharray 1s linear' : 'none' }}
                />
                <text x="80" y="74" textAnchor="middle" style={{ fill: 'var(--card-text)', fontSize: 22, fontWeight: 700, fontFamily: 'Consolas' }}>
                  {String(pomMins).padStart(2,'0')}:{String(pomSecs).padStart(2,'0')}
                </text>
                <text x="80" y="92" textAnchor="middle" style={{ fill: 'var(--card-text-3)', fontSize: 9, fontFamily: 'Consolas' }}>
                  {pomMode === 'work' ? 'FOCUS' : 'BREAK'}
                </text>
                {Array.from({ length: 4 }, (_, i) => (
                  <circle key={i} cx={68 + i * 9} cy={108} r="3"
                    fill={i < pomSessions % 4 ? 'rgba(134,239,172,0.9)' : 'rgba(255,255,255,0.1)'} />
                ))}
              </svg>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 flex-1">
              <button onClick={() => { if (!pomRunning) unlockAudio(); togglePom() }}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition border"
                style={{
                  background: pomRunning ? 'rgba(255,255,255,0.15)' : 'rgba(134,239,172,0.2)',
                  borderColor: pomRunning ? 'rgba(255,255,255,0.2)' : 'rgba(134,239,172,0.4)',
                  color: pomRunning ? 'rgba(255,255,255,0.8)' : 'rgba(134,239,172,1)',
                }}>
                {pomRunning ? <Pause size={15} /> : <Play size={15} />}
                {pomRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => switchPomMode(pomMode === 'work' ? 'short_break' : 'work')}
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition">
                <Coffee size={13} />
                {pomMode === 'work' ? 'Take Break' : 'Back to Focus'}
              </button>
              <button onClick={stopPom}
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-white/10 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 transition">
                <Square size={13} />
                Stop
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── LEADERBOARD ──────────────────────────────────────── */}
      <div className="col-span-12 t-card rounded-2xl border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold t-ct-3 uppercase tracking-widest flex-shrink-0">Today's Leaderboard</span>
          <span className="text-xs t-ct-3 text-right leading-4">
            <span className="hidden sm:inline">Top {leaderboard.length} · 1pt/focus min · 2pt/task&habit · 5pt/quiz&flashcard</span>
            <span className="sm:hidden">1pt focus · 2pt task/habit · 5pt quiz/card</span>
          </span>
        </div>

        {lbError ? (
          <div className="text-center py-4 space-y-1">
            <p className="text-sm text-red-400">Leaderboard not set up yet.</p>
            <p className="text-xs t-ct-3">Run <span className="font-mono bg-black/20 px-1 rounded">supabase/leaderboard.sql</span> in your Supabase SQL Editor.</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm t-ct-3 text-center py-4">No activity today yet — complete a task, habit or pomodoro to appear!</p>
        ) : (() => {
          const myIdx = leaderboard.findIndex(e => e.user_id === user?.id)
          const visibleEntries = lbExpanded
            ? leaderboard
            : leaderboard.slice(0, 3)
          // If user is outside top 3 and not expanded, append their entry separately
          const showMyEntry = !lbExpanded && myIdx >= 3
          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
                {visibleEntries.map((entry, i) => {
                  const rankColor = i < 3 ? RANK_COLORS[i] : undefined
                  const isMe = entry.user_id === user?.id
                  return (
                    <div key={entry.user_id}
                      className={`flex items-center gap-3 py-2 px-2 rounded-lg transition ${isMe ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                      <span className="w-6 text-center text-xs font-black flex-shrink-0"
                        style={{ color: rankColor ?? 'rgba(255,255,255,0.3)' }}>
                        {i + 1}
                      </span>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white/20" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/20">
                          {(entry.username || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <span className={`text-xs font-semibold truncate flex-1 ${isMe ? 'text-white' : 't-ct'}`}>
                        {entry.username}{isMe ? ' (you)' : ''}
                      </span>
                      <div className="flex flex-col items-end flex-shrink-0 w-14">
                        <span className="text-xs font-mono font-semibold tabular-nums"
                          style={{ color: i < 3 ? RANK_COLORS[i] : 'rgba(255,255,255,0.4)' }}>
                          {entry.total_points}pts
                        </span>
                        <span className="text-[10px] t-ct-3 font-mono tabular-nums">
                          {entry.pom_hours}h focus
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Current user's entry when outside top 3 and collapsed */}
              {showMyEntry && (
                <>
                  <div className="flex items-center gap-2 my-1">
                    <div className="flex-1 border-t border-white/10" />
                    <span className="text-[10px] t-ct-3">···</span>
                    <div className="flex-1 border-t border-white/10" />
                  </div>
                  {(() => {
                    const entry = leaderboard[myIdx]
                    return (
                      <div className="flex items-center gap-3 py-2 px-2 rounded-lg bg-white/10">
                        <span className="w-6 text-center text-xs font-black flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {myIdx + 1}
                        </span>
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-white/20" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/20">
                            {(entry.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-semibold truncate flex-1 text-white">
                          {entry.username} (you)
                        </span>
                        <div className="flex flex-col items-end flex-shrink-0 w-14">
                          <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {entry.total_points}pts
                          </span>
                          <span className="text-[10px] t-ct-3 font-mono tabular-nums">{entry.pom_hours}h focus</span>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}

              {leaderboard.length > 3 && (
                <button
                  onClick={() => setLbExpanded(e => !e)}
                  className="mt-1 w-full text-xs t-ct-3 hover:text-white/70 transition py-1.5 rounded-lg hover:bg-white/5 text-center"
                >
                  {lbExpanded ? '▲ Show less' : `▼ Show all ${leaderboard.length} players`}
                </button>
              )}
            </>
          )
        })()}
      </div>

    </div>
  )
}
