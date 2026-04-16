// ── AI Generation via Supabase Edge Function ──────────────────────────────────
// The Gemini API key lives on the server as a Supabase secret.
// Users never need to provide a key.

import { supabase } from './supabase'

export interface GeneratedCard {
  front: string
  back: string
}

export interface GeneratedQuestion {
  question: string
  options: string[]      // always 4 items
  correct_index: number  // 0-3
  explanation: string
}

async function callGenerate(type: 'flashcards' | 'quiz', text: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  const res = await fetch(`${supabaseUrl}/functions/v1/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ type, text }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
  return data.result as string
}

/** Generate 8-15 flashcards from the given text. */
export async function generateFlashcards(text: string): Promise<GeneratedCard[]> {
  const raw = await callGenerate('flashcards', text)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI returned an unexpected format. Try again.')
  return JSON.parse(match[0]) as GeneratedCard[]
}

/** Generate 8-12 multiple-choice questions from the given text. */
export async function generateQuiz(text: string): Promise<GeneratedQuestion[]> {
  const raw = await callGenerate('quiz', text)
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('AI returned an unexpected format. Try again.')
  return JSON.parse(match[0]) as GeneratedQuestion[]
}
