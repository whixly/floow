import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Trash2, MapPin, Clock, CheckSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO
} from 'date-fns'
import type { CalendarEvent, Task } from '../../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-green-400',
}
const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'border-red-400',
  high: 'border-orange-400',
  medium: 'border-yellow-400',
  low: 'border-green-400',
}

export default function SchedulePage() {
  const { user } = useStore()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')

  const load = async () => {
    if (!user) return
    const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const [{ data: evData }, { data: tkData }] = await Promise.all([
      supabase.from('events').select('*').eq('user_id', user.id)
        .gte('start_time', `${start}T00:00:00`).lte('start_time', `${end}T23:59:59`).order('start_time'),
      supabase.from('tasks').select('*').eq('user_id', user.id)
        .not('due_date', 'is', null).gte('due_date', start).lte('due_date', end),
    ])
    setEvents(evData ?? [])
    setTasks(tkData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user, currentDate])

  const getTasksForDay = (day: Date) => tasks.filter(t => t.due_date && isSameDay(parseISO(t.due_date), day))

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title || !startTime || !endTime) return
    const { data } = await supabase.from('events').insert({
      user_id: user.id, title: title.trim(),
      description: description.trim() || null,
      start_time: startTime, end_time: endTime,
      location: location.trim() || null,
    }).select().single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setTitle(''); setDescription(''); setStartTime(''); setEndTime(''); setLocation('')
    setShowForm(false)
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) })
  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.start_time), day))
  const selectedDayEvents = getEventsForDay(selectedDate)
  const tasksDueThisMonth = tasks.length
  const defaultStart = `${format(selectedDate, 'yyyy-MM-dd')}T09:00`
  const defaultEnd = `${format(selectedDate, 'yyyy-MM-dd')}T10:00`

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          <p className="t-text-dim text-sm mt-1">{events.length} events · {tasksDueThisMonth} tasks due this month</p>
        </div>
        <button onClick={() => { setShowForm(true); setStartTime(defaultStart); setEndTime(defaultEnd) }}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition">
          <Plus size={16} /> Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddEvent} className="t-card rounded-xl border p-5 space-y-4 fade-in">
          <h3 className="font-semibold t-ct">New Event</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title *" required className={inputCls} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className={`${inputCls} resize-none`} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium t-ct-2 block mb-1">Start</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium t-ct-2 block mb-1">End</label>
              <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required className={inputCls} />
            </div>
          </div>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className={inputCls} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/20">Save Event</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 t-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold t-ct text-lg">{format(currentDate, 'MMMM yyyy')}</h2>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1.5 rounded-lg hover:bg-black/10 t-ct-2 transition"><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-xs font-medium rounded-lg hover:bg-black/10 t-ct-2 transition">Today</button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1.5 rounded-lg hover:bg-black/10 t-ct-2 transition"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium t-ct-3 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayEvents = getEventsForDay(day)
              const dayTasks = getTasksForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isCurrent = isToday(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square flex flex-col items-center justify-start p-1 rounded-lg transition text-sm ${
                    isSelected ? 'bg-[var(--theme-bg)] text-white border-2 border-white/30' :
                    isCurrent ? 'border-2 border-[var(--theme-bg)] t-ct' :
                    isCurrentMonth ? 't-ct hover:bg-black/5' : 't-ct-3'
                  }`}>
                  <span className="font-medium text-xs">{format(day, 'd')}</span>
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {dayEvents.length > 0 && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--theme-bg)]'}`} />
                    )}
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : PRIORITY_DOT[t.priority]}`} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Day Events + Tasks */}
        <div className="t-card rounded-xl border p-5">
          <h3 className="font-semibold t-ct mb-1">{format(selectedDate, 'EEEE')}</h3>
          <p className="text-sm t-ct-2 mb-4">{format(selectedDate, 'MMMM d, yyyy')}</p>
          {selectedDayEvents.length === 0 && getTasksForDay(selectedDate).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm t-ct-3">No events or tasks</p>
              <button onClick={() => { setShowForm(true); setStartTime(defaultStart); setEndTime(defaultEnd) }}
                className="mt-2 text-xs text-[var(--theme-bg)] hover:underline">Add event</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {selectedDayEvents.map(event => (
                <li key={event.id} className="p-3 rounded-lg border-l-4 border-[var(--theme-bg)] bg-black/5 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm t-ct truncate">{event.title}</p>
                      <p className="text-xs t-ct-2 flex items-center gap-1 mt-1">
                        <Clock size={11} /> {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
                      </p>
                      {event.location && (
                        <p className="text-xs t-ct-3 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} /> {event.location}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteEvent(event.id)} className="opacity-0 group-hover:opacity-100 t-ct-3 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
              {getTasksForDay(selectedDate).map(task => (
                <li key={task.id} className={`p-3 rounded-lg border-l-4 bg-black/5 ${PRIORITY_BORDER[task.priority]}`}>
                  <div className="flex items-center gap-2">
                    <CheckSquare size={13} className={`flex-shrink-0 ${task.status === 'done' ? 'text-green-400' : 't-ct-3'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm t-ct truncate ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </p>
                      <p className="text-xs t-ct-3 capitalize mt-0.5">{task.priority} priority · {task.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
