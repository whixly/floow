import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, format,
  addMonths, subMonths, subDays
} from 'date-fns'
import { ChevronLeft, ChevronRight, Play, Pause, Square, Coffee } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { Task, CalendarEvent, Habit, Goal, Note, HabitLog } from '../../types'
import { ACCENT_COLORS } from '../../types'

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

// ── Pomodoro durations ────────────────────────────────────────
const POM_DURATIONS = { work: 25 * 60, short_break: 5 * 60 }
type PomMode = 'work' | 'short_break'

// ── Colors for goals ──────────────────────────────────────────
const PIE_FALLBACK = ['#86efac','#6ee7b7','#67e8f9','#a5b4fc','#fca5a5','#fcd34d','#c4b5fd','#fb923c']

export default function Dashboard() {
  const { user } = useStore()
  const navigate = useNavigate()

  // Data
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [events,    setEvents]    = useState<CalendarEvent[]>([])
  const [habits,    setHabits]    = useState<Habit[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([])
  const [goals,     setGoals]     = useState<Goal[]>([])
  const [notes,     setNotes]     = useState<Note[]>([])
  const [loading,   setLoading]   = useState(true)

  // Calendar
  const [calMonth, setCalMonth] = useState(new Date())

  // Pomodoro mini-timer
  const [pomMode,    setPomMode]    = useState<PomMode>('work')
  const [pomTime,    setPomTime]    = useState(POM_DURATIONS.work)
  const [pomRunning, setPomRunning] = useState(false)
  const [pomSessions, setPomSessions] = useState(0)
  const pomRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const today    = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  // Calendar grid
  const monthStart = startOfMonth(calMonth)
  const gridStart  = startOfWeek(monthStart,      { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 })
  const calDays    = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Habit grid — last 30 days
  const GRID_DAYS = 30
  const gridDates = Array.from({ length: GRID_DAYS }, (_, i) =>
    format(subDays(today, GRID_DAYS - 1 - i), 'yyyy-MM-dd')
  )

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const since30 = format(subDays(today, 29), 'yyyy-MM-dd')
      const [t, e, h, hl, g, n, p] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).neq('status', 'done').order('created_at', { ascending: false }).limit(6),
        supabase.from('events').select('*').eq('user_id', user.id).order('start_time'),
        supabase.from('habits').select('*').eq('user_id', user.id).limit(8),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('completed_date', since30),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('status', 'active').limit(6),
        supabase.from('notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
        supabase.from('pomodoro_sessions').select('id').eq('user_id', user.id).eq('session_type', 'work').gte('completed_at', `${todayStr}T00:00:00`),
      ])
      setTasks(t.data ?? [])
      setEvents(e.data ?? [])
      setHabits(h.data ?? [])
      setHabitLogs(hl.data ?? [])
      setGoals(g.data ?? [])
      setNotes(n.data ?? [])
      setPomSessions(p.data?.length ?? 0)
      setLoading(false)
    }
    load()
  }, [user])

  // ── Pomodoro timer ────────────────────────────────────────
  useEffect(() => {
    if (pomRunning) {
      pomRef.current = setInterval(() => {
        setPomTime(prev => {
          if (prev <= 1) {
            clearInterval(pomRef.current!)
            setPomRunning(false)
            if (pomMode === 'work') setPomSessions(s => s + 1)
            return POM_DURATIONS[pomMode]
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (pomRef.current) clearInterval(pomRef.current)
    }
    return () => { if (pomRef.current) clearInterval(pomRef.current) }
  }, [pomRunning, pomMode])

  const switchPomMode = (m: PomMode) => {
    setPomMode(m); setPomTime(POM_DURATIONS[m]); setPomRunning(false)
  }
  const stopPom = () => { setPomRunning(false); setPomTime(POM_DURATIONS[pomMode]) }

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

  // ── Pomodoro clock face ────────────────────────────────────
  const pomProgress  = 1 - pomTime / POM_DURATIONS[pomMode]
  const pomCircumf   = 2 * Math.PI * 72
  const pomMins      = Math.floor(pomTime / 60)
  const pomSecs      = pomTime % 60

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="fade-in grid grid-cols-12 gap-4" style={{ minHeight: 'calc(100vh - 7rem)' }}>

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
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

        {/* HABIT TRACKER — HabitKit grid */}
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Habit Tracker</span>
            <Link to="/app/habits" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>

          {habits.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-3">No habits yet</p>
          ) : (
            <div className="space-y-2">
              {/* Day labels: every 5th day */}
              <div className="flex gap-[3px] pl-[72px]">
                {gridDates.map((d, i) => (
                  <div key={d} className="w-[10px] text-center">
                    {i % 5 === 0 && <span className="text-[8px] t-ct-3">{format(new Date(d),'d')}</span>}
                  </div>
                ))}
              </div>
              {/* Habit rows */}
              {habits.slice(0, 6).map(habit => {
                const color = ACCENT_COLORS[habit.color] || '#22c55e'
                return (
                  <div key={habit.id} className="flex items-center gap-2">
                    <span className="text-xs t-ct truncate w-[68px] flex-shrink-0 text-right pr-1">{habit.name}</span>
                    <div className="flex gap-[3px]">
                      {gridDates.map(d => (
                        <div key={d}
                          title={d}
                          className="w-[10px] h-[10px] rounded-[2px] transition-all"
                          style={{
                            backgroundColor: isHabitDone(habit.id, d) ? color : 'rgba(255,255,255,0.08)',
                            opacity: isHabitDone(habit.id, d) ? 1 : 0.6,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
              {/* Legend */}
              <div className="flex items-center gap-2 pt-1 justify-end">
                <span className="text-[9px] t-ct-3">Less</span>
                {[0.1, 0.3, 0.6, 0.8, 1].map(o => (
                  <div key={o} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: `rgba(134,239,172,${o})` }} />
                ))}
                <span className="text-[9px] t-ct-3">More</span>
              </div>
            </div>
          )}
        </div>

        {/* GOAL PIE CHART */}
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Goals</span>
            <Link to="/app/goals" className="text-xs t-ct-3 hover:text-white transition">view all</Link>
          </div>

          {goals.length === 0 ? (
            <p className="text-sm t-ct-3 text-center py-6">No active goals</p>
          ) : (
            <div className="flex items-center gap-4">
              {/* Pie SVG */}
              <svg viewBox="0 0 180 180" className="w-[140px] h-[140px] flex-shrink-0">
                {pieSlices.map((s, i) => (
                  <path key={s.id} d={s.path} fill={s.color} opacity={0.85}
                    className="hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => navigate('/app/goals')}>
                    <title>{s.title} — {s.progress}%</title>
                  </path>
                ))}
                {/* Center hole */}
                <circle cx="90" cy="90" r="44" fill="var(--card-bg)" />
                <text x="90" y="86" textAnchor="middle" className="fill-current" style={{ fill: 'var(--card-text)', fontSize: 18, fontWeight: 700, fontFamily: 'Consolas' }}>
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
        <div className="t-card rounded-2xl border p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold t-ct-3 uppercase tracking-widest">Pomodoro</span>
            <span className="text-xs t-ct-3">{pomSessions} sessions today</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock face */}
            <div className="relative flex-shrink-0" style={{ width: 130, height: 130 }}>
              <svg viewBox="0 0 160 160" className="w-full h-full">
                {/* Clock face */}
                <circle cx="80" cy="80" r="74" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
                {/* Tick marks */}
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
                {/* Progress arc track */}
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                {/* Progress arc */}
                <circle cx="80" cy="80" r="72" fill="none"
                  stroke={pomMode === 'work' ? 'rgba(134,239,172,0.85)' : 'rgba(147,197,253,0.85)'}
                  strokeWidth="8"
                  strokeDasharray={`${pomProgress * 2 * Math.PI * 72} ${2 * Math.PI * 72}`}
                  strokeDashoffset={2 * Math.PI * 72 * 0.25}
                  strokeLinecap="round"
                  style={{ transition: pomRunning ? 'stroke-dasharray 1s linear' : 'none' }}
                />
                {/* Center time */}
                <text x="80" y="74" textAnchor="middle" style={{ fill: 'var(--card-text)', fontSize: 22, fontWeight: 700, fontFamily: 'Consolas' }}>
                  {String(pomMins).padStart(2,'0')}:{String(pomSecs).padStart(2,'0')}
                </text>
                <text x="80" y="92" textAnchor="middle" style={{ fill: 'var(--card-text-3)', fontSize: 9, fontFamily: 'Consolas' }}>
                  {pomMode === 'work' ? 'FOCUS' : 'BREAK'}
                </text>
                {/* Session dots */}
                {Array.from({ length: 4 }, (_, i) => (
                  <circle key={i} cx={68 + i * 9} cy={108} r="3"
                    fill={i < pomSessions % 4 ? 'rgba(134,239,172,0.9)' : 'rgba(255,255,255,0.1)'} />
                ))}
              </svg>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 flex-1">
              {/* Play / Pause */}
              <button onClick={() => setPomRunning(r => !r)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition border"
                style={{
                  background: pomRunning ? 'rgba(255,255,255,0.15)' : 'rgba(134,239,172,0.2)',
                  borderColor: pomRunning ? 'rgba(255,255,255,0.2)' : 'rgba(134,239,172,0.4)',
                  color: pomRunning ? 'rgba(255,255,255,0.8)' : 'rgba(134,239,172,1)',
                }}>
                {pomRunning ? <Pause size={15} /> : <Play size={15} />}
                {pomRunning ? 'Pause' : 'Start'}
              </button>
              {/* Break */}
              <button onClick={() => switchPomMode(pomMode === 'work' ? 'short_break' : 'work')}
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition">
                <Coffee size={13} />
                {pomMode === 'work' ? 'Take Break' : 'Back to Focus'}
              </button>
              {/* Stop */}
              <button onClick={stopPom}
                className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium border border-white/10 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-300 transition">
                <Square size={13} />
                Stop
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
