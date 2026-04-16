// Supabase Edge Function — AI Generation Proxy
// Calls Google Gemini on behalf of the user.
// Deploy: Supabase Dashboard → Edge Functions → New function → paste this → name it "generate"
// Secret:  Supabase Dashboard → Project Settings → Secrets → add GEMINI_API_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FLASHCARD_PROMPT = (text: string) => `Create flashcards from the text below. Return ONLY a valid JSON array — no markdown, no explanation, no code fences.
Each element must have "front" (question or term) and "back" (answer or definition).
Create 8–15 cards covering the most important concepts.

Text:
${text}

Example output:
[{"front":"What is photosynthesis?","back":"The process by which plants convert sunlight, CO₂, and water into glucose and oxygen."}]`

const QUIZ_PROMPT = (text: string) => `Create a multiple-choice quiz from the text below. Return ONLY a valid JSON array — no markdown, no explanation, no code fences.
Each element must have:
  "question": string
  "options": array of exactly 4 strings
  "correct_index": number 0-3 (index of the correct option)
  "explanation": short string explaining why the answer is correct

Create 8–12 questions covering key concepts.

Text:
${text}

Example output:
[{"question":"What does chlorophyll do?","options":["Stores water","Absorbs sunlight","Produces oxygen","Transports nutrients"],"correct_index":1,"explanation":"Chlorophyll is the pigment that absorbs sunlight for photosynthesis."}]`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'content-type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'content-type': 'application/json' }
      })
    }

    const { type, text } = await req.json() as { type: 'flashcards' | 'quiz', text: string }
    if (!type || !text?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing type or text' }), {
        status: 400, headers: { ...cors, 'content-type': 'application/json' }
      })
    }

    const prompt = type === 'flashcards' ? FLASHCARD_PROMPT(text) : QUIZ_PROMPT(text)

    const geminiRes = await fetch(`${GEMINI_API}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      }),
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.json()
      throw new Error(err?.error?.message ?? `Gemini error ${geminiRes.status}`)
    }

    const data = await geminiRes.json()
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    return new Response(JSON.stringify({ result }), {
      headers: { ...cors, 'content-type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...cors, 'content-type': 'application/json' }
    })
  }
})
