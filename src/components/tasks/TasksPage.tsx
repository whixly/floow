import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, CheckCircle, Circle, Clock, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import type { Task } from '../../types'

const priorities = ['low', 'medium', 'high', 'urgent'] as const
const statuses = ['todo', 'in_progress', 'done'] as const
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

const priorityColors: Record<string, string> = {
  urgent: 'text-red-500 bg-red-500/10',
  high: 'text-orange-500 bg-orange-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  low: 'text-green-500 bg-green-500/10',
}

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-white/70 transition t-input border'

export default function TasksPage() {
  const { user } = useStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tagInput, setTagInput] = useState('')

  const load = async () => {
    if (!user) return
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id, title: title.trim(),
      description: description.trim() || null,
      priority, due_date: dueDate || null, tags, status: 'todo',
    }).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setTagInput('')
    setShowForm(false)
  }

  const toggleStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="t-text-dim text-sm mt-1">{tasks.filter(t => t.status !== 'done').length} remaining</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="t-card rounded-xl border p-5 space-y-4 fade-in">
          <h3 className="font-semibold t-ct">New Task</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title *" required className={inputCls} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className={`${inputCls} resize-none`} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium t-ct-2 block mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as typeof priority)} className={inputCls}>
                {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium t-ct-2 block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tags (comma separated)" className={inputCls} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/30">Add Task</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none t-input" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border text-sm focus:outline-none t-input">
          <option value="all">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 rounded-lg border text-sm focus:outline-none t-input">
          <option value="all">All Priority</option>
          {priorities.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="t-card rounded-xl border p-16 text-center">
          <CheckCircle size={40} className="mx-auto text-white/20 mb-3" />
          <p className="t-ct font-medium">No tasks found</p>
          <p className="t-ct-3 text-sm">Add a new task to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id}
              className={`flex items-start gap-3 p-4 t-card rounded-xl border hover:bg-white/[0.12] transition-all ${task.status === 'done' ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleStatus(task)} className="mt-0.5 flex-shrink-0 text-[var(--theme-bg)] hover:opacity-80 transition">
                {task.status === 'done' ? <CheckCircle size={20} /> : task.status === 'in_progress' ? <Circle size={20} className="text-yellow-500" /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium t-ct ${task.status === 'done' ? 'line-through t-ct-3' : ''}`}>{task.title}</p>
                {task.description && <p className="text-sm t-ct-2 mt-0.5 truncate">{task.description}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 t-ct-2">{statusLabels[task.status]}</span>
                  {task.due_date && (
                    <span className="text-xs t-ct-3 flex items-center gap-1">
                      <Clock size={11} /> {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                  {task.tags?.map(tag => (
                    <span key={tag} className="text-xs flex items-center gap-1 t-ct-3"><Tag size={10} /> {tag}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="t-ct-3 hover:text-red-500 transition flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
