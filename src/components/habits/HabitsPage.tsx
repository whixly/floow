import { useEffect, useState } from 'react'
import { Plus, Trash2, Flame, CheckCircle, Circle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format, subDays } from 'date-fns'
import { fireAchievement } from '../../lib/achievement'
import type { Habit, HabitLog } from '../../types'
import { ACCENT_COLORS } from '../../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

export default function HabitsPage() {
  const { user } = useStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('Green')

  const today = format(new Date(), 'yyyy-MM-dd')

  const load = async () => {
    if (!user) return
    const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')
    const [h, l] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('completed_date', sevenDaysAgo),
    ])
    setHabits(h.data ?? [])
    setLogs(l.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return
    const { data } = await supabase.from('habits').insert({
      user_id: user.id, name: name.trim(),
      description: description.trim() || null, color, streak: 0, frequency: 'daily',
    }).select().single()
    if (data) setHabits(prev => [...prev, data])
    setName(''); setDescription(''); setColor('Green')
    setShowForm(false)
  }

  const toggleToday = async (habit: Habit) => {
    const isCompleted = logs.some(l => l.habit_id === habit.id && l.completed_date === today)
    if (isCompleted) {
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('completed_date', today)
      setLogs(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === today)))
      const newStreak = Math.max(0, habit.streak - 1)
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habit.id)
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, streak: newStreak } : h))
    } else {
      const { data } = await supabase.from('habit_logs').insert({ habit_id: habit.id, user_id: user!.id, completed_date: today }).select().single()
      if (data) setLogs(prev => [...prev, data])
      fireAchievement('habit')
      const newStreak = habit.streak + 1
      await supabase.from('habits').update({ streak: newStreak }).eq('id', habit.id)
      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, streak: newStreak } : h))
    }
  }

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setLogs(prev => prev.filter(l => l.habit_id !== id))
  }

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
  const isCompletedOn = (habitId: string, date: string) => logs.some(l => l.habit_id === habitId && l.completed_date === date)
  const todayCompleted = habits.filter(h => isCompletedOn(h.id, today)).length

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Habits</h1>
          <p className="t-text-dim text-sm mt-1">{todayCompleted}/{habits.length} done today</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition">
          <Plus size={16} /> Add Habit
        </button>
      </div>

      {habits.length > 0 && (
        <div className="t-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium t-ct">Today's Progress</p>
            <p className="text-sm font-bold" style={{ color: 'var(--theme-bg)' }}>
              {habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0}%
            </p>
          </div>
          <div className="w-full bg-black/10 rounded-full h-2.5">
            <div className="h-2.5 rounded-full bg-[var(--theme-bg)] transition-all duration-500"
              style={{ width: `${habits.length > 0 ? (todayCompleted / habits.length) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="t-card rounded-xl border p-5 space-y-4 fade-in">
          <h3 className="font-semibold t-ct">New Habit</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Habit name *" required className={inputCls} />
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" className={inputCls} />
          <div>
            <label className="text-xs font-medium t-ct-2 block mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ACCENT_COLORS).map(([n, hex]) => (
                <button key={n} type="button" onClick={() => setColor(n)}
                  className={`w-6 h-6 rounded-full border-2 transition ${color === n ? 'border-white scale-125' : 'border-transparent'}`}
                  style={{ backgroundColor: hex }} title={n} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/20">Add Habit</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : habits.length === 0 ? (
        <div className="t-card rounded-xl border p-16 text-center">
          <Flame size={40} className="mx-auto text-white/20 mb-3" />
          <p className="t-ct font-medium">No habits yet</p>
          <p className="t-ct-3 text-sm">Start building your daily routines</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => {
            const doneToday = isCompletedOn(habit.id, today)
            const habitColor = ACCENT_COLORS[habit.color] || ACCENT_COLORS['Green']
            return (
              <div key={habit.id} className="t-card rounded-xl border p-4 hover:bg-white/[0.12] transition-all">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleToday(habit)} className="flex-shrink-0 transition-transform hover:scale-110"
                    style={{ color: doneToday ? habitColor : 'rgba(255,255,255,0.2)' }}>
                    {doneToday ? <CheckCircle size={28} /> : <Circle size={28} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium t-ct ${doneToday ? 'line-through t-ct-3' : ''}`}>{habit.name}</p>
                    {habit.description && <p className="text-xs t-ct-2 mt-0.5 truncate">{habit.description}</p>}
                    <div className="flex gap-1 mt-2">
                      {last7Days.map(date => (
                        <div key={date} title={date} className="w-5 h-5 rounded transition"
                          style={{ backgroundColor: isCompletedOn(habit.id, date) ? habitColor : 'rgba(0,0,0,0.12)' }} />
                      ))}
                      <span className="text-xs t-ct-3 ml-1 self-center">7d</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Flame size={16} style={{ color: habitColor }} />
                        <span className="font-bold text-lg t-ct">{habit.streak}</span>
                      </div>
                      <p className="text-xs t-ct-3">streak</p>
                    </div>
                    <button onClick={() => deleteHabit(habit.id)} className="t-ct-3 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
