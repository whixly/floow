import { useEffect, useState, useRef } from 'react'
import {
  Plus, Trash2, BookOpen, ChevronLeft, Sparkles,
  Upload, RotateCcw, Check, X, Layers
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { generateFlashcards, type GeneratedCard } from '../../lib/ai'
import type { FlashcardDeck, Flashcard } from '../../types'

type View = 'decks' | 'create' | 'study'

// ── Spaced-repetition intervals (days) ─────────────────────────
const INTERVALS = { hard: 1, good: 3, easy: 7 }

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

// ── Flip Card ──────────────────────────────────────────────────
function FlipCard({ front, back, flipped, onClick }: {
  front: string; back: string; flipped: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{ perspective: '1200px' }}
      className="w-full max-w-xl mx-auto cursor-pointer select-none"
    >
      <div style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        position: 'relative',
        height: '220px',
      }}>
        {/* Front */}
        <div className="t-card rounded-2xl border p-8 flex flex-col items-center justify-center absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}>
          <span className="text-xs t-ct-3 uppercase tracking-widest mb-4 font-semibold">Question</span>
          <p className="text-lg font-semibold t-ct text-center leading-relaxed">{front}</p>
          <p className="text-xs t-ct-3 mt-6">tap to reveal answer</p>
        </div>
        {/* Back */}
        <div className="t-card rounded-2xl border p-8 flex flex-col items-center justify-center absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(255,255,255,0.08)' }}>
          <span className="text-xs t-ct-3 uppercase tracking-widest mb-4 font-semibold">Answer</span>
          <p className="text-lg font-semibold t-ct text-center leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  )
}

export default function FlashcardsPage() {
  const { user } = useStore()
  const [view, setView] = useState<View>('decks')
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [loading, setLoading] = useState(true)

  // create form
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual')
  const [manualCards, setManualCards] = useState<GeneratedCard[]>([{ front: '', back: '' }])
  const [aiText, setAiText] = useState('')
  const [aiCards, setAiCards] = useState<GeneratedCard[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // study mode
  const [studyDeck, setStudyDeck] = useState<FlashcardDeck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ hard: 0, good: 0, easy: 0 })


  useEffect(() => { loadDecks() }, [user])

  async function loadDecks() {
    if (!user) return
    setLoading(true)
    const { data: deckData } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (deckData) {
      const { data: countData } = await supabase
        .from('flashcards')
        .select('deck_id')
        .eq('user_id', user.id)

      const counts: Record<string, number> = {}
      countData?.forEach(r => { counts[r.deck_id] = (counts[r.deck_id] ?? 0) + 1 })
      setDecks(deckData.map(d => ({ ...d, card_count: counts[d.id] ?? 0 })))
    }
    setLoading(false)
  }

  async function openStudy(deck: FlashcardDeck) {
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('next_review', { ascending: true })
    if (!data?.length) return
    setStudyDeck(deck)
    setCards(data)
    setCardIdx(0)
    setFlipped(false)
    setDone(false)
    setStats({ hard: 0, good: 0, easy: 0 })
    setView('study')
  }

  async function rateCard(rating: 'hard' | 'good' | 'easy') {
    const card = cards[cardIdx]
    const difficulty = rating === 'hard' ? 1 : rating === 'good' ? 2 : 3
    await supabase.from('flashcards').update({
      difficulty,
      next_review: daysFromNow(INTERVALS[rating]),
    }).eq('id', card.id)

    setStats(s => ({ ...s, [rating]: s[rating] + 1 }))

    if (cardIdx + 1 >= cards.length) {
      setDone(true)
    } else {
      setCardIdx(i => i + 1)
      setFlipped(false)
    }
  }

  async function deleteDeck(id: string) {
    await supabase.from('flashcard_decks').delete().eq('id', id)
    setDecks(d => d.filter(x => x.id !== id))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setAiText(ev.target?.result as string)
    reader.readAsText(file)
  }

  async function handleGenerate() {
    if (!aiText.trim()) { setGenError('Paste some text first.'); return }
    setGenerating(true); setGenError('')
    try {
      const cards = await generateFlashcards(aiText)
      setAiCards(cards)
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed.')
    }
    setGenerating(false)
  }

  async function handleSaveDeck() {
    if (!user || !title.trim()) return
    const cards = inputMode === 'manual' ? manualCards.filter(c => c.front.trim() && c.back.trim()) : aiCards
    if (!cards.length) return
    setSaving(true)

    const { data: deck } = await supabase
      .from('flashcard_decks')
      .insert({ user_id: user.id, title: title.trim(), description: desc.trim() || null })
      .select().single()

    if (deck) {
      await supabase.from('flashcards').insert(
        cards.map(c => ({ deck_id: deck.id, user_id: user.id, front: c.front, back: c.back }))
      )
    }

    setSaving(false)
    resetCreate()
    await loadDecks()
    setView('decks')
  }

  function resetCreate() {
    setTitle(''); setDesc(''); setInputMode('manual')
    setManualCards([{ front: '', back: '' }])
    setAiText(''); setAiCards([]); setGenError('')
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

  // ── Decks List ──────────────────────────────────────────────
  if (view === 'decks') return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Flashcards</h1>
          <p className="t-text-dim text-sm mt-1">Study smarter with spaced repetition</p>
        </div>
        <button onClick={() => { resetCreate(); setView('create') }}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
          <Plus size={15} /> New Deck
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : decks.length === 0 ? (
        <div className="t-card rounded-2xl border p-12 flex flex-col items-center gap-4 text-center">
          <Layers size={40} className="t-ct-3" />
          <div>
            <p className="font-semibold t-ct">No decks yet</p>
            <p className="text-sm t-ct-3 mt-1">Create your first deck manually or let AI generate cards from your notes.</p>
          </div>
          <button onClick={() => { resetCreate(); setView('create') }}
            className="mt-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
            Create Deck
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map(deck => (
            <div key={deck.id} className="t-card rounded-2xl border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold t-ct truncate">{deck.title}</h3>
                  {deck.description && <p className="text-xs t-ct-3 mt-0.5 line-clamp-2">{deck.description}</p>}
                </div>
                <button onClick={() => deleteDeck(deck.id)}
                  className="text-white/30 hover:text-red-400 transition flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs t-ct-3 bg-white/10 px-2.5 py-1 rounded-full">
                  {deck.card_count ?? 0} cards
                </span>
              </div>
              <button onClick={() => openStudy(deck)}
                disabled={!deck.card_count}
                className="flex items-center justify-center gap-2 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <BookOpen size={14} /> Study
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Create Deck ─────────────────────────────────────────────
  if (view === 'create') return (
    <div className="fade-in space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => { resetCreate(); setView('decks') }}
          className="text-white/60 hover:text-white transition">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">New Deck</h1>
      </div>

      {/* Deck info */}
      <div className="t-card rounded-2xl border p-5 space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Deck title *" className={inputCls} />
        <input value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)" className={inputCls} />
      </div>

      {/* Input mode toggle */}
      <div className="flex gap-2">
        {(['manual', 'ai'] as const).map(m => (
          <button key={m} onClick={() => setInputMode(m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              inputMode === m
                ? 'bg-white/90 border-white/50'
                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
            }`}
            style={inputMode === m ? { color: 'var(--theme-bg)' } : {}}>
            {m === 'ai' ? <Sparkles size={14} /> : <Plus size={14} />}
            {m === 'manual' ? 'Add Manually' : 'Generate with AI'}
          </button>
        ))}
      </div>

      {/* Manual cards */}
      {inputMode === 'manual' && (
        <div className="space-y-3">
          {manualCards.map((card, i) => (
            <div key={i} className="t-card rounded-xl border p-4 flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <input value={card.front} onChange={e => {
                    const c = [...manualCards]; c[i] = { ...c[i], front: e.target.value }; setManualCards(c)
                  }} placeholder={`Card ${i + 1} — Front (question / term)`} className={inputCls} />
                <input value={card.back} onChange={e => {
                    const c = [...manualCards]; c[i] = { ...c[i], back: e.target.value }; setManualCards(c)
                  }} placeholder="Back (answer / definition)" className={inputCls} />
              </div>
              {manualCards.length > 1 && (
                <button onClick={() => setManualCards(c => c.filter((_, j) => j !== i))}
                  className="text-white/30 hover:text-red-400 transition mt-1">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setManualCards(c => [...c, { front: '', back: '' }])}
            className="flex items-center gap-2 text-sm t-ct-2 hover:text-white transition px-1">
            <Plus size={14} /> Add card
          </button>
        </div>
      )}

      {/* AI generation */}
      {inputMode === 'ai' && (
        <div className="space-y-4">
          <div className="t-card rounded-2xl border p-5 space-y-3">
            <textarea
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              placeholder="Paste your notes, textbook excerpt, or any text here…"
              rows={7}
              className={`${inputCls} resize-none`}
            />
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium rounded-lg border border-white/20 transition">
                <Upload size={13} /> Upload .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
              <button onClick={handleGenerate} disabled={generating}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg border border-white/20 transition disabled:opacity-50">
                {generating ? (
                  <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={13} /> Generate Flashcards</>
                )}
              </button>
            </div>
            {genError && <p className="text-red-300 text-xs">{genError}</p>}
          </div>

          {/* Preview generated cards */}
          {aiCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold t-ct">{aiCards.length} cards generated</p>
                <button onClick={() => setAiCards([])}
                  className="flex items-center gap-1 text-xs t-ct-3 hover:text-white transition">
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
              {aiCards.map((card, i) => (
                <div key={i} className="t-card rounded-xl border p-4 space-y-2">
                  <div className="flex gap-3">
                    <span className="text-xs font-bold t-ct-3 w-4 shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <input value={card.front} onChange={e => {
                          const c = [...aiCards]; c[i] = { ...c[i], front: e.target.value }; setAiCards(c)
                        }} className={inputCls} />
                      <input value={card.back} onChange={e => {
                          const c = [...aiCards]; c[i] = { ...c[i], back: e.target.value }; setAiCards(c)
                        }} className={inputCls} />
                    </div>
                    <button onClick={() => setAiCards(c => c.filter((_, j) => j !== i))}
                      className="text-white/30 hover:text-red-400 transition mt-1 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSaveDeck}
        disabled={saving || !title.trim() || (inputMode === 'manual' && !manualCards.some(c => c.front.trim())) || (inputMode === 'ai' && !aiCards.length)}
        className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl border border-white/20 transition disabled:opacity-40">
        {saving ? 'Saving…' : <><Check size={16} /> Save Deck</>}
      </button>
    </div>
  )

  // ── Study Mode ──────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('decks')} className="text-white/60 hover:text-white transition">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{studyDeck?.title}</h1>
          <p className="text-xs t-ct-3">
            {done ? 'Session complete!' : `Card ${cardIdx + 1} of ${cards.length}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-1.5">
        <div className="bg-white/70 h-1.5 rounded-full transition-all"
          style={{ width: `${(cardIdx / cards.length) * 100}%` }} />
      </div>

      {done ? (
        /* Done screen */
        <div className="t-card rounded-2xl border p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Check size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Session complete!</p>
            <p className="text-sm t-ct-3 mt-1">You reviewed {cards.length} cards</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center"><p className="text-red-300 font-bold text-lg">{stats.hard}</p><p className="t-ct-3">Hard</p></div>
            <div className="text-center"><p className="text-yellow-300 font-bold text-lg">{stats.good}</p><p className="t-ct-3">Good</p></div>
            <div className="text-center"><p className="text-green-300 font-bold text-lg">{stats.easy}</p><p className="t-ct-3">Easy</p></div>
          </div>
          <button onClick={() => openStudy(studyDeck!)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
            <RotateCcw size={14} /> Study Again
          </button>
        </div>
      ) : (
        <>
          <FlipCard
            front={cards[cardIdx].front}
            back={cards[cardIdx].back}
            flipped={flipped}
            onClick={() => setFlipped(f => !f)}
          />

          {/* Rating buttons — only show after flip */}
          {flipped ? (
            <div className="flex gap-3 justify-center">
              <button onClick={() => rateCard('hard')}
                className="flex-1 max-w-[120px] py-3 rounded-xl border border-red-400/40 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-semibold transition">
                Hard
              </button>
              <button onClick={() => rateCard('good')}
                className="flex-1 max-w-[120px] py-3 rounded-xl border border-yellow-400/40 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-sm font-semibold transition">
                Good
              </button>
              <button onClick={() => rateCard('easy')}
                className="flex-1 max-w-[120px] py-3 rounded-xl border border-green-400/40 bg-green-500/20 hover:bg-green-500/30 text-green-200 text-sm font-semibold transition">
                Easy
              </button>
            </div>
          ) : (
            <p className="text-center text-sm t-ct-3">Click the card to reveal the answer</p>
          )}
        </>
      )}
    </div>
  )
}
