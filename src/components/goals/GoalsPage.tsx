import { useEffect, useState } from 'react'
import { Plus, Trash2, Target, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import type { Goal, Milestone } from '../../types'
import { ACCENT_COLORS } from '../../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

export default function GoalsPage() {
  const { user } = useStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)
  const [newMilestone, setNewMilestone] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [color, setColor] = useState('Indigo')

  const load = async () => {
    if (!user) return
    const [g, m] = await Promise.all([
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('milestones').select('*').eq('user_id', user.id).order('created_at'),
    ])
    setGoals(g.data ?? [])
    setMilestones(m.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return
    const { data } = await supabase.from('goals').insert({
      user_id: user.id, title: title.trim(),
      description: description.trim() || null,
      target_date: targetDate || null, color, progress: 0, status: 'active',
    }).select().single()
    if (data) setGoals(prev => [data, ...prev])
    setTitle(''); setDescription(''); setTargetDate(''); setColor('Indigo')
    setShowForm(false)
  }

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
    setMilestones(prev => prev.filter(m => m.goal_id !== id))
  }

  const updateProgress = async (goal: Goal, progress: number) => {
    const clamped = Math.max(0, Math.min(100, progress))
    const status = clamped === 100 ? 'completed' : 'active'
    await supabase.from('goals').update({ progress: clamped, status }).eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress: clamped, status } : g))
  }

  const updateStatus = async (goal: Goal, status: Goal['status']) => {
    await supabase.from('goals').update({ status }).eq('id', goal.id)
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status } : g))
  }

  const addMilestone = async (goalId: string) => {
    const text = newMilestone[goalId]?.trim()
    if (!user || !text) return
    const { data } = await supabase.from('milestones').insert({
      goal_id: goalId, user_id: user.id, title: text, is_completed: false,
    }).select().single()
    if (data) setMilestones(prev => [...prev, data])
    setNewMilestone(prev => ({ ...prev, [goalId]: '' }))
  }

  const toggleMilestone = async (milestone: Milestone) => {
    const updated = !milestone.is_completed
    await supabase.from('milestones').update({ is_completed: updated }).eq('id', milestone.id)
    const updatedList = milestones.map(m => m.id === milestone.id ? { ...m, is_completed: updated } : m)
    setMilestones(updatedList)
    const goalMilestones = updatedList.filter(m => m.goal_id === milestone.goal_id)
    if (goalMilestones.length > 0) {
      const progress = Math.round((goalMilestones.filter(m => m.is_completed).length / goalMilestones.length) * 100)
      const goal = goals.find(g => g.id === milestone.goal_id)
      if (goal) updateProgress(goal, progress)
    }
  }

  const deleteMilestone = async (id: string) => {
    await supabase.from('milestones').delete().eq('id', id)
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  const statusColors: Record<string, string> = {
    active: 'text-blue-400 bg-blue-400/10',
    completed: 'text-green-400 bg-green-400/10',
    paused: 'text-white/50 bg-white/10',
  }

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="t-text-dim text-sm mt-1">
            {goals.filter(g => g.status === 'active').length} active · {goals.filter(g => g.status === 'completed').length} completed
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition">
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="t-card rounded-xl border p-5 space-y-4 fade-in">
          <h3 className="font-semibold t-ct">New Goal</h3>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title *" required className={inputCls} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className={`${inputCls} resize-none`} />
          <div>
            <label className="text-xs font-medium t-ct-2 block mb-1">Target Date</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className={inputCls} />
          </div>
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
            <button type="submit" className="px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/20">Add Goal</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <div className="t-card rounded-xl border p-16 text-center">
          <Target size={40} className="mx-auto text-white/20 mb-3" />
          <p className="t-ct font-medium">No goals yet</p>
          <p className="t-ct-3 text-sm">Set your first goal to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => {
            const goalColor = ACCENT_COLORS[goal.color] || ACCENT_COLORS['Indigo']
            const goalMilestones = milestones.filter(m => m.goal_id === goal.id)
            const isExpanded = expandedGoal === goal.id
            return (
              <div key={goal.id} className="t-card rounded-xl border overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${goalColor}25` }}>
                      <Target size={20} style={{ color: goalColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold t-ct">{goal.title}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select value={goal.status} onChange={e => updateStatus(goal, e.target.value as Goal['status'])}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 ${statusColors[goal.status]} focus:outline-none bg-transparent`}>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="paused">Paused</option>
                          </select>
                          <button onClick={() => deleteGoal(goal.id)} className="t-ct-3 hover:text-red-500 transition">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {goal.description && <p className="text-sm t-ct-2 mb-2">{goal.description}</p>}
                      {goal.target_date && <p className="text-xs t-ct-3 mb-2">Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</p>}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs t-ct-2">Progress</span>
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" value={goal.progress}
                              onChange={e => updateProgress(goal, parseInt(e.target.value) || 0)}
                              className="w-14 text-xs text-center px-1 py-0.5 rounded border t-input focus:outline-none" />
                            <span className="text-xs font-semibold" style={{ color: goalColor }}>%</span>
                          </div>
                        </div>
                        <div className="w-full bg-black/10 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${goal.progress}%`, backgroundColor: goalColor }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-black/10">
                  <button onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                    className="w-full flex items-center justify-between px-5 py-2.5 text-sm t-ct-2 hover:bg-black/5 transition">
                    <span className="font-medium">Milestones ({goalMilestones.length})</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2">
                      {goalMilestones.map(m => (
                        <div key={m.id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleMilestone(m)} style={{ color: m.is_completed ? goalColor : 'rgba(0,0,0,0.2)' }}>
                            {m.is_completed ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                          <span className={`flex-1 text-sm ${m.is_completed ? 'line-through t-ct-3' : 't-ct'}`}>{m.title}</span>
                          <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 t-ct-3 hover:text-red-500 transition">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input value={newMilestone[goal.id] || ''} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(goal.id) } }}
                          onChange={e => setNewMilestone(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          placeholder="Add milestone..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border t-input focus:outline-none" />
                        <button onClick={() => addMilestone(goal.id)} className="px-3 py-1.5 bg-[var(--theme-bg)] text-white text-sm rounded-lg hover:opacity-90 transition border border-white/20">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
