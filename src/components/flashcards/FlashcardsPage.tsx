import { useEffect, useState } from 'react'
import {
  Plus, Trash2, BookOpen, ChevronLeft,
  RotateCcw, Check, X, Layers
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import type { FlashcardDeck, Flashcard } from '../../types'

type View = 'decks' | 'create' | 'study'

interface CardDraft { front: string; back: string }

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
    <div onClick={onClick} style={{ perspective: '1200px' }}
      className="w-full max-w-xl mx-auto cursor-pointer select-none">
      <div style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        position: 'relative', height: '220px',
      }}>
        <div className="t-card rounded-2xl border p-8 flex flex-col items-center justify-center absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}>
          <span className="text-xs t-ct-3 uppercase tracking-widest mb-4 font-semibold">Question</span>
          <p className="text-lg font-semibold t-ct text-center leading-relaxed">{front}</p>
          <p className="text-xs t-ct-3 mt-6">tap to reveal answer</p>
        </div>
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
  const [title,       setTitle]       = useState('')
  const [desc,        setDesc]        = useState('')
  const [cards,       setCards]       = useState<CardDraft[]>([{ front: '', back: '' }])
  const [saving,      setSaving]      = useState(false)

  // study mode
  const [studyDeck, setStudyDeck] = useState<FlashcardDeck | null>(null)
  const [studyCards, setStudyCards] = useState<Flashcard[]>([])
  const [cardIdx, setCardIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ hard: 0, good: 0, easy: 0 })

  useEffect(() => { loadDecks() }, [user])

  async function loadDecks() {
    if (!user) return
    setLoading(true)
    const { data: deckData } = await supabase
      .from('flashcard_decks').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (deckData) {
      const { data: countData } = await supabase
        .from('flashcards').select('deck_id').eq('user_id', user.id)
      const counts: Record<string, number> = {}
      countData?.forEach(r => { counts[r.deck_id] = (counts[r.deck_id] ?? 0) + 1 })
      setDecks(deckData.map(d => ({ ...d, card_count: counts[d.id] ?? 0 })))
    }
    setLoading(false)
  }

  async function openStudy(deck: FlashcardDeck) {
    const { data } = await supabase.from('flashcards').select('*')
      .eq('deck_id', deck.id).order('next_review', { ascending: true })
    if (!data?.length) return
    setStudyDeck(deck)
    setStudyCards(data)
    setCardIdx(0); setFlipped(false); setDone(false)
    setStats({ hard: 0, good: 0, easy: 0 })
    setView('study')
  }

  async function rateCard(rating: 'hard' | 'good' | 'easy') {
    const card = studyCards[cardIdx]
    const difficulty = rating === 'hard' ? 1 : rating === 'good' ? 2 : 3
    await supabase.from('flashcards').update({
      difficulty, next_review: daysFromNow(INTERVALS[rating]),
    }).eq('id', card.id)
    setStats(s => ({ ...s, [rating]: s[rating] + 1 }))
    if (cardIdx + 1 >= studyCards.length) {
      setDone(true)
      if (user && studyDeck) {
        supabase.from('flashcard_sessions').insert({
          deck_id: studyDeck.id, user_id: user.id, cards_reviewed: studyCards.length,
        }).then(() => {})
      }
    } else {
      setCardIdx(i => i + 1); setFlipped(false)
    }
  }

  async function deleteDeck(id: string) {
    await supabase.from('flashcard_decks').delete().eq('id', id)
    setDecks(d => d.filter(x => x.id !== id))
  }

  async function handleSaveDeck() {
    if (!user || !title.trim()) return
    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (!validCards.length) return
    setSaving(true)
    const { data: deck } = await supabase
      .from('flashcard_decks')
      .insert({ user_id: user.id, title: title.trim(), description: desc.trim() || null })
      .select().single()
    if (deck) {
      await supabase.from('flashcards').insert(
        validCards.map(c => ({ deck_id: deck.id, user_id: user.id, front: c.front, back: c.back }))
      )
    }
    setSaving(false)
    resetCreate()
    await loadDecks()
    setView('decks')
  }

  function resetCreate() {
    setTitle(''); setDesc('')
    setCards([{ front: '', back: '' }])
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
            <p className="text-sm t-ct-3 mt-1">Create your first deck to start studying.</p>
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
              <span className="text-xs t-ct-3 bg-white/10 px-2.5 py-1 rounded-full w-fit">
                {deck.card_count ?? 0} cards
              </span>
              <button onClick={() => openStudy(deck)} disabled={!deck.card_count}
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

      {/* Cards */}
      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={i} className="t-card rounded-xl border p-4 flex gap-3 items-start">
            <span className="text-xs font-bold t-ct-3 w-5 mt-2.5 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 space-y-2">
              <input value={card.front}
                onChange={e => { const c = [...cards]; c[i] = { ...c[i], front: e.target.value }; setCards(c) }}
                placeholder="Front — question or term" className={inputCls} />
              <input value={card.back}
                onChange={e => { const c = [...cards]; c[i] = { ...c[i], back: e.target.value }; setCards(c) }}
                placeholder="Back — answer or definition" className={inputCls} />
            </div>
            {cards.length > 1 && (
              <button onClick={() => setCards(c => c.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-red-400 transition mt-1 flex-shrink-0">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => setCards(c => [...c, { front: '', back: '' }])}
          className="flex items-center gap-2 text-sm t-ct-2 hover:text-white transition px-1">
          <Plus size={14} /> Add card
        </button>
      </div>

      <button onClick={handleSaveDeck}
        disabled={saving || !title.trim() || !cards.some(c => c.front.trim() && c.back.trim())}
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
            {done ? 'Session complete!' : `Card ${cardIdx + 1} of ${studyCards.length}`}
          </p>
        </div>
      </div>

      <div className="w-full bg-white/10 rounded-full h-1.5">
        <div className="bg-white/70 h-1.5 rounded-full transition-all"
          style={{ width: `${(cardIdx / studyCards.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="t-card rounded-2xl border p-10 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Check size={28} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Session complete!</p>
            <p className="text-sm t-ct-3 mt-1">You reviewed {studyCards.length} cards</p>
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
            front={studyCards[cardIdx].front}
            back={studyCards[cardIdx].back}
            flipped={flipped}
            onClick={() => setFlipped(f => !f)}
          />
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
