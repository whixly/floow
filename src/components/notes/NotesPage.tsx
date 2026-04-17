import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Pin, PinOff, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { format } from 'date-fns'
import type { Note, Notebook } from '../../types'

const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

export default function NotesPage() {
  const { user } = useStore()
  const [notes, setNotes] = useState<Note[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [selectedNotebook, setSelectedNotebook] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [showNotebookForm, setShowNotebookForm] = useState(false)

  const load = async () => {
    if (!user) return
    const [n, nb] = await Promise.all([
      supabase.from('notes').select('*').eq('user_id', user.id).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('notebooks').select('*').eq('user_id', user.id).order('created_at'),
    ])
    setNotes(n.data ?? [])
    setNotebooks(nb.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const createNote = async () => {
    if (!user) return
    const { data } = await supabase.from('notes').insert({
      user_id: user.id, title: 'Untitled Note', content: '',
      notebook_id: selectedNotebook !== 'all' ? selectedNotebook : null,
      is_pinned: false,
    }).select().single()
    if (data) { setNotes(prev => [data, ...prev]); setSelectedNote(data) }
  }

  const updateNote = async (note: Note, changes: Partial<Note>) => {
    const updated = { ...note, ...changes }
    setSelectedNote(updated)
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n))
    await supabase.from('notes').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', note.id)
  }

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedNote?.id === id) setSelectedNote(null)
  }

  const createNotebook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newNotebookName.trim()) return
    const { data } = await supabase.from('notebooks').insert({ user_id: user.id, name: newNotebookName.trim() }).select().single()
    if (data) setNotebooks(prev => [...prev, data])
    setNewNotebookName(''); setShowNotebookForm(false)
  }

  const filtered = notes.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase())
    const matchNotebook = selectedNotebook === 'all' || n.notebook_id === selectedNotebook
    return matchSearch && matchNotebook
  })

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="t-text-dim text-sm mt-1">{notes.length} notes</p>
        </div>
        <button onClick={createNote}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium text-sm transition">
          <Plus size={16} /> New Note
        </button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Left Panel — hidden on mobile when a note is open */}
        <div className={`flex flex-col gap-3 flex-shrink-0 w-full md:w-72 ${selectedNote ? 'hidden md:flex' : 'flex'}`}>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none t-input" />
          </div>

          {/* Notebooks */}
          <div className="t-card rounded-xl border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold t-ct-3 uppercase tracking-wider">Notebooks</p>
              <button onClick={() => setShowNotebookForm(!showNotebookForm)} className="t-ct-2 hover:t-ct transition">
                <Plus size={14} />
              </button>
            </div>
            {showNotebookForm && (
              <form onSubmit={createNotebook} className="flex gap-1 mb-2">
                <input value={newNotebookName} onChange={e => setNewNotebookName(e.target.value)} placeholder="Name" autoFocus
                  className="flex-1 px-2 py-1 text-xs rounded border t-input" />
                <button type="submit" className="px-2 py-1 bg-[var(--theme-bg)] text-white text-xs rounded border border-white/20">OK</button>
              </form>
            )}
            <button onClick={() => setSelectedNotebook('all')}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${selectedNotebook === 'all' ? 'bg-[var(--theme-bg)] text-white' : 't-ct hover:bg-black/5'}`}>
              All Notes ({notes.length})
            </button>
            {notebooks.map(nb => (
              <button key={nb.id} onClick={() => setSelectedNotebook(nb.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition flex items-center gap-2 ${selectedNotebook === nb.id ? 'bg-[var(--theme-bg)] text-white' : 't-ct hover:bg-black/5'}`}>
                <BookOpen size={13} /> {nb.name} ({notes.filter(n => n.notebook_id === nb.id).length})
              </button>
            ))}
          </div>

          {/* Note List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="flex justify-center pt-8">
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-white/50 pt-8">No notes yet</p>
            ) : (
              filtered.map(note => (
                <button key={note.id} onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-3 rounded-lg border transition ${selectedNote?.id === note.id
                    ? 'bg-white/25 border-white/40'
                    : 't-card border hover:bg-white/[0.15]'}`}>
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-sm font-medium truncate ${selectedNote?.id === note.id ? 'text-white' : 't-ct'}`}>
                      {note.title || 'Untitled'}
                    </p>
                    {note.is_pinned && <Pin size={11} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${selectedNote?.id === note.id ? 'text-white/70' : 't-ct-2'}`}>
                    {note.content || 'No content'}
                  </p>
                  <p className={`text-xs mt-1 ${selectedNote?.id === note.id ? 'text-white/50' : 't-ct-3'}`}>
                    {format(new Date(note.updated_at), 'MMM d, yyyy')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor — hidden on mobile when no note is open */}
        <div className={`flex-1 t-card rounded-xl border flex-col overflow-hidden ${selectedNote ? 'flex' : 'hidden md:flex'}`}>
          {selectedNote ? (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Back button — mobile only */}
                  <button onClick={() => setSelectedNote(null)} className="md:hidden t-ct-2 hover:t-ct transition flex-shrink-0" title="Back">
                    ←
                  </button>
                  <input value={selectedNote.title} onChange={e => updateNote(selectedNote, { title: e.target.value })}
                    className="text-lg font-semibold t-ct bg-transparent flex-1 focus:outline-none min-w-0" placeholder="Note title" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateNote(selectedNote, { is_pinned: !selectedNote.is_pinned })}
                    className={`p-1.5 rounded hover:bg-black/5 transition ${selectedNote.is_pinned ? 'text-yellow-500' : 't-ct-3'}`}>
                    {selectedNote.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <button onClick={() => deleteNote(selectedNote.id)}
                    className="p-1.5 rounded hover:bg-black/5 t-ct-3 hover:text-red-500 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <textarea value={selectedNote.content} onChange={e => updateNote(selectedNote, { content: e.target.value })}
                placeholder="Start writing..."
                className="flex-1 px-5 py-4 t-ct-2 bg-transparent resize-none focus:outline-none text-sm leading-relaxed" />
              <div className="px-5 py-2 border-t border-black/10">
                <p className="text-xs t-ct-3">Last edited {format(new Date(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <BookOpen size={48} className="t-ct-3 mb-4" />
              <p className="t-ct font-medium">Select a note or create a new one</p>
              <button onClick={createNote} className="mt-4 px-4 py-2 bg-[var(--theme-bg)] text-white text-sm rounded-lg hover:opacity-90 transition border border-white/20">
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
