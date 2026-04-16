import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Coffee, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import type { PomodoroSession } from '../../types'

type Mode = 'work' | 'short_break' | 'long_break'

const DURATIONS: Record<Mode, number> = { work: 25 * 60, short_break: 5 * 60, long_break: 15 * 60 }
const MODE_LABELS: Record<Mode, string> = { work: 'Focus', short_break: 'Short Break', long_break: 'Long Break' }

export default function PomodoroPage() {
  const { user } = useStore()
  const [mode, setMode] = useState<Mode>('work')
  const [timeLeft, setTimeLeft] = useState(DURATIONS['work'])
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState<PomodoroSession[]>([])
  const [sessionsToday, setSessionsToday] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (!user) return
    supabase.from('pomodoro_sessions').select('*').eq('user_id', user.id)
      .gte('completed_at', `${today}T00:00:00`).order('completed_at', { ascending: false })
      .then(({ data }) => {
        setSessions(data ?? [])
        setSessionsToday(data?.filter(s => s.session_type === 'work').length ?? 0)
      })
  }, [user])

  useEffect(() => {
    if (running) {
      startedRef.current = true
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const handleSessionComplete = async () => {
    if (!user || !startedRef.current) return
    const { data } = await supabase.from('pomodoro_sessions').insert({
      user_id: user.id, duration_minutes: DURATIONS[mode] / 60, session_type: mode,
    }).select().single()
    if (data) {
      setSessions(prev => [data, ...prev])
      if (mode === 'work') setSessionsToday(prev => prev + 1)
    }
    startedRef.current = false
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode); setTimeLeft(DURATIONS[newMode]); setRunning(false); startedRef.current = false
  }

  const reset = () => { setTimeLeft(DURATIONS[mode]); setRunning(false); startedRef.current = false }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const progress = 1 - timeLeft / DURATIONS[mode]
  const circumference = 2 * Math.PI * 90

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pomodoro Timer</h1>
        <p className="t-text-dim text-sm mt-1">{sessionsToday} focus sessions today</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        {(['work', 'short_break', 'long_break'] as Mode[]).map(m => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === m ? 'bg-white/90 shadow-sm' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            style={mode === m ? { color: 'var(--theme-bg)' } : {}}>
            {m === 'work' ? <Zap size={14} /> : <Coffee size={14} />}
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer */}
      <div className="t-card rounded-2xl border p-8 flex flex-col items-center">
        <div className="relative w-52 h-52 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="10" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--theme-bg)" strokeWidth="10"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold t-ct tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-sm t-ct-2 mt-1">{MODE_LABELS[mode]}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={reset} className="p-3 rounded-full bg-black/10 t-ct-2 hover:bg-black/20 transition">
            <RotateCcw size={20} />
          </button>
          <button onClick={() => setRunning(!running)}
            className="w-16 h-16 rounded-full bg-[var(--theme-bg)] text-white flex items-center justify-center shadow-lg hover:opacity-90 transition hover:scale-105 border-2 border-white/30">
            {running ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
        </div>

        <div className="flex gap-2 mt-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition ${i < sessionsToday % 4 ? 'bg-[var(--theme-bg)]' : 'bg-black/15'}`} />
          ))}
        </div>
        <p className="text-xs t-ct-3 mt-1">{4 - (sessionsToday % 4)} sessions until long break</p>
      </div>

      {sessions.length > 0 && (
        <div className="t-card rounded-xl border p-5">
          <h3 className="font-semibold t-ct mb-4">Today's Sessions</h3>
          <div className="space-y-2">
            {sessions.map(session => (
              <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/5">
                <div className={`w-2 h-2 rounded-full ${session.session_type === 'work' ? 'bg-[var(--theme-bg)]' : 'bg-green-400'}`} />
                <span className="text-sm t-ct flex-1">
                  {MODE_LABELS[session.session_type as Mode]} — {session.duration_minutes} min
                </span>
                <span className="text-xs t-ct-3">{format(new Date(session.completed_at), 'h:mm a')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
