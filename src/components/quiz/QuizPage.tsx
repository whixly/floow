import { useEffect, useState, useRef } from 'react'
import {
  Plus, Trash2, Brain, ChevronLeft, Sparkles,
  Upload, RotateCcw, Check, X, ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'
import { generateQuiz, type GeneratedQuestion } from '../../lib/ai'
import type { Quiz, QuizQuestion } from '../../types'

type View = 'list' | 'create' | 'take' | 'result'

interface AttemptAnswer {
  chosen: number | null
  correct: number
  question: string
  options: string[]
  explanation: string | null
}

export default function QuizPage() {
  const { user } = useStore()
  const [view, setView] = useState<View>('list')
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  // create
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [aiText, setAiText] = useState('')
  const [genQuestions, setGenQuestions] = useState<GeneratedQuestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // take quiz
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AttemptAnswer[]>([])
  const [showExplanation, setShowExplanation] = useState(false)


  useEffect(() => { loadQuizzes() }, [user])

  async function loadQuizzes() {
    if (!user) return
    setLoading(true)
    const { data: qData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (qData) {
      const { data: qCounts } = await supabase
        .from('quiz_questions')
        .select('quiz_id')

      const counts: Record<string, number> = {}
      qCounts?.forEach(r => { counts[r.quiz_id] = (counts[r.quiz_id] ?? 0) + 1 })

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, score, total')
        .eq('user_id', user.id)

      const bestScores: Record<string, number> = {}
      attempts?.forEach(a => {
        const pct = Math.round((a.score / a.total) * 100)
        if (!bestScores[a.quiz_id] || pct > bestScores[a.quiz_id]) bestScores[a.quiz_id] = pct
      })

      setQuizzes(qData.map(q => ({
        ...q,
        question_count: counts[q.id] ?? 0,
        best_score: bestScores[q.id],
      })))
    }
    setLoading(false)
  }

  async function openQuiz(quiz: Quiz) {
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true })
    if (!data?.length) return
    setActiveQuiz(quiz)
    setQuestions(data)
    setQIdx(0)
    setChosen(null)
    setAnswers([])
    setShowExplanation(false)
    setView('take')
  }

  async function deleteQuiz(id: string) {
    await supabase.from('quizzes').delete().eq('id', id)
    setQuizzes(q => q.filter(x => x.id !== id))
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
      const qs = await generateQuiz(aiText)
      setGenQuestions(qs)
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Generation failed.')
    }
    setGenerating(false)
  }

  async function handleSaveQuiz() {
    if (!user || !title.trim() || !genQuestions.length) return
    setSaving(true)

    const { data: quiz } = await supabase
      .from('quizzes')
      .insert({ user_id: user.id, title: title.trim(), description: desc.trim() || null })
      .select().single()

    if (quiz) {
      await supabase.from('quiz_questions').insert(
        genQuestions.map((q, i) => ({
          quiz_id: quiz.id,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          sort_order: i,
        }))
      )
    }

    setSaving(false)
    resetCreate()
    await loadQuizzes()
    setView('list')
  }

  function resetCreate() {
    setTitle(''); setDesc(''); setAiText('')
    setGenQuestions([]); setGenError('')
  }

  function selectAnswer(idx: number) {
    if (chosen !== null) return
    setChosen(idx)
    setShowExplanation(true)
  }

  function nextQuestion() {
    const q = questions[qIdx]
    setAnswers(prev => [...prev, {
      chosen,
      correct: q.correct_index,
      question: q.question,
      options: q.options as string[],
      explanation: q.explanation,
    }])

    if (qIdx + 1 >= questions.length) {
      // save attempt
      const score = [...answers, { chosen, correct: q.correct_index }]
        .filter(a => a.chosen === a.correct).length
      supabase.from('quiz_attempts').insert({
        quiz_id: activeQuiz!.id,
        user_id: user!.id,
        score,
        total: questions.length,
      })
      setView('result')
    } else {
      setQIdx(i => i + 1)
      setChosen(null)
      setShowExplanation(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition t-input'

  // ── Quiz List ───────────────────────────────────────────────
  if (view === 'list') return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quizzes</h1>
          <p className="t-text-dim text-sm mt-1">Test your knowledge with AI-generated questions</p>
        </div>
        <button onClick={() => { resetCreate(); setView('create') }}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
          <Plus size={15} /> New Quiz
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="t-card rounded-2xl border p-12 flex flex-col items-center gap-4 text-center">
          <Brain size={40} className="t-ct-3" />
          <div>
            <p className="font-semibold t-ct">No quizzes yet</p>
            <p className="text-sm t-ct-3 mt-1">Paste your notes and let AI build a quiz for you in seconds.</p>
          </div>
          <button onClick={() => { resetCreate(); setView('create') }}
            className="mt-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
            Create Quiz
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="t-card rounded-2xl border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold t-ct truncate">{quiz.title}</h3>
                  {quiz.description && <p className="text-xs t-ct-3 mt-0.5 line-clamp-2">{quiz.description}</p>}
                </div>
                <button onClick={() => deleteQuiz(quiz.id)}
                  className="text-white/30 hover:text-red-400 transition flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs t-ct-3 bg-white/10 px-2.5 py-1 rounded-full">
                  {quiz.question_count ?? 0} questions
                </span>
                {quiz.best_score !== undefined && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    quiz.best_score >= 80 ? 'bg-green-500/20 text-green-300' :
                    quiz.best_score >= 50 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    Best: {quiz.best_score}%
                  </span>
                )}
              </div>
              <button onClick={() => openQuiz(quiz)}
                disabled={!quiz.question_count}
                className="flex items-center justify-center gap-2 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <Brain size={14} /> Take Quiz
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Create Quiz ─────────────────────────────────────────────
  if (view === 'create') return (
    <div className="fade-in space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => { resetCreate(); setView('list') }}
          className="text-white/60 hover:text-white transition">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">New Quiz</h1>
      </div>

      <div className="t-card rounded-2xl border p-5 space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Quiz title *" className={inputCls} />
        <input value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Description (optional)" className={inputCls} />
      </div>


      <div className="t-card rounded-2xl border p-5 space-y-3">
        <p className="text-sm font-semibold t-ct">Source Text</p>
        <textarea
          value={aiText}
          onChange={e => setAiText(e.target.value)}
          placeholder="Paste your notes, textbook excerpt, or any text here…"
          rows={8}
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
              <><Sparkles size={13} /> Generate Quiz</>
            )}
          </button>
        </div>
        {genError && <p className="text-red-300 text-xs">{genError}</p>}
      </div>

      {/* Preview questions */}
      {genQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold t-ct">{genQuestions.length} questions generated</p>
            <button onClick={() => setGenQuestions([])}
              className="flex items-center gap-1 text-xs t-ct-3 hover:text-white transition">
              <RotateCcw size={12} /> Clear
            </button>
          </div>
          {genQuestions.map((q, i) => (
            <div key={i} className="t-card rounded-xl border p-4 space-y-2">
              <div className="flex gap-2">
                <span className="text-xs font-bold t-ct-3 shrink-0 w-5 mt-0.5">{i + 1}.</span>
                <p className="text-sm font-semibold t-ct">{q.question}</p>
              </div>
              <div className="pl-5 space-y-1">
                {q.options.map((opt, j) => (
                  <p key={j} className={`text-xs px-2 py-1 rounded-lg ${
                    j === q.correct_index ? 'bg-green-500/20 text-green-200 font-medium' : 't-ct-3'
                  }`}>
                    {['A', 'B', 'C', 'D'][j]}. {opt}
                  </p>
                ))}
              </div>
              {q.explanation && (
                <p className="pl-5 text-xs t-ct-3 italic">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSaveQuiz}
        disabled={saving || !title.trim() || !genQuestions.length}
        className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl border border-white/20 transition disabled:opacity-40">
        {saving ? 'Saving…' : <><Check size={16} /> Save Quiz</>}
      </button>
    </div>
  )

  // ── Take Quiz ───────────────────────────────────────────────
  if (view === 'take') {
    const q = questions[qIdx]
    const total = questions.length
    const isCorrect = chosen === q.correct_index

    return (
      <div className="fade-in space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-white/60 hover:text-white transition">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{activeQuiz?.title}</h1>
            <p className="text-xs t-ct-3">Question {qIdx + 1} of {total}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-1.5">
          <div className="bg-white/70 h-1.5 rounded-full transition-all"
            style={{ width: `${(qIdx / total) * 100}%` }} />
        </div>

        {/* Question card */}
        <div className="t-card rounded-2xl border p-6 space-y-5">
          <p className="text-base font-semibold t-ct leading-relaxed">{q.question}</p>

          <div className="space-y-2">
            {(q.options as string[]).map((opt, j) => {
              let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition '
              if (chosen === null) {
                cls += 'border-white/20 t-ct hover:bg-white/10 hover:border-white/40'
              } else if (j === q.correct_index) {
                cls += 'border-green-400/50 bg-green-500/20 text-green-200'
              } else if (j === chosen) {
                cls += 'border-red-400/50 bg-red-500/20 text-red-200'
              } else {
                cls += 'border-white/10 t-ct-3 opacity-50'
              }
              return (
                <button key={j} className={cls} onClick={() => selectAnswer(j)} disabled={chosen !== null}>
                  <span className="font-bold mr-3 t-ct-3">{['A', 'B', 'C', 'D'][j]}.</span>
                  {opt}
                  {chosen !== null && j === q.correct_index && <Check size={14} className="inline ml-2 text-green-300" />}
                  {chosen !== null && j === chosen && j !== q.correct_index && <X size={14} className="inline ml-2 text-red-300" />}
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showExplanation && (
            <div className={`rounded-xl p-4 text-sm ${isCorrect ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
              <p className="font-semibold mb-1">{isCorrect ? 'Correct!' : 'Incorrect'}</p>
              {q.explanation && <p className="opacity-90">{q.explanation}</p>}
            </div>
          )}
        </div>

        {chosen !== null && (
          <div className="flex justify-end">
            <button onClick={nextQuestion}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
              {qIdx + 1 >= total ? 'See Results' : 'Next'} <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Results ─────────────────────────────────────────────────
  const score = answers.filter(a => a.chosen === a.correct).length
  const pct = Math.round((score / answers.length) * 100)

  return (
    <div className="fade-in space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="text-white/60 hover:text-white transition">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Results</h1>
      </div>

      {/* Score card */}
      <div className="t-card rounded-2xl border p-8 flex flex-col items-center gap-3 text-center">
        <div className={`text-5xl font-black ${pct >= 80 ? 'text-green-300' : pct >= 50 ? 'text-yellow-300' : 'text-red-300'}`}>
          {pct}%
        </div>
        <p className="text-white font-semibold text-lg">
          {score} / {answers.length} correct
        </p>
        <p className="t-ct-3 text-sm">
          {pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort — keep studying!' : 'Keep practising, you got this!'}
        </p>
        <button onClick={() => openQuiz(activeQuiz!)}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition">
          <RotateCcw size={14} /> Try Again
        </button>
      </div>

      {/* Answer review */}
      <div className="space-y-3">
        <p className="text-sm font-semibold t-ct">Review Answers</p>
        {answers.map((a, i) => (
          <div key={i} className={`t-card rounded-xl border p-4 space-y-2 ${
            a.chosen === a.correct ? 'border-green-400/20' : 'border-red-400/20'
          }`}>
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 ${a.chosen === a.correct ? 'text-green-300' : 'text-red-300'}`}>
                {a.chosen === a.correct ? <Check size={14} /> : <X size={14} />}
              </span>
              <p className="text-sm font-medium t-ct">{a.question}</p>
            </div>
            <div className="pl-5 space-y-1">
              {a.options.map((opt, j) => (
                <p key={j} className={`text-xs ${
                  j === a.correct ? 'text-green-300 font-medium' :
                  j === a.chosen  ? 'text-red-300' : 't-ct-3 opacity-60'
                }`}>
                  {['A','B','C','D'][j]}. {opt}
                  {j === a.correct && ' ✓'}
                  {j === a.chosen && j !== a.correct && ' ✗'}
                </p>
              ))}
            </div>
            {a.explanation && (
              <p className="pl-5 text-xs t-ct-3 italic">{a.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
