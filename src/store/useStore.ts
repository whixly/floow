import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { ACCENT_COLORS, DARK_COLORS } from '../types'

export type PomMode = 'work' | 'short_break'
export const POM_DURATIONS: Record<PomMode, number> = { work: 25 * 60, short_break: 5 * 60 }

interface AppStore {
  user: User | null
  accentColor: string
  theme: 'light' | 'dark'
  setUser: (user: User | null) => void
  setAccentColor: (color: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  applyTheme: () => void

  // ── Pomodoro (persisted, survives navigation) ──────────────
  pomMode: PomMode
  pomRunning: boolean
  pomStartedAt: number | null    // Date.now() when last started/resumed
  pomRemainingAtStart: number    // seconds left when last started/resumed
  togglePom: () => void
  switchPomMode: (mode: PomMode) => void
  stopPom: () => void
  completePomCycle: () => void   // called when timer hits 0
  getPomTime: () => number       // computed: current seconds remaining
}

function applyCSS(accentColor: string, theme: 'light' | 'dark') {
  const colorMap = theme === 'dark' ? DARK_COLORS : ACCENT_COLORS
  const bg = colorMap[accentColor] || colorMap['Blue']
  const root = document.documentElement

  root.style.setProperty('--theme-bg', bg)

  if (theme === 'dark') {
    root.classList.add('dark')
    root.style.setProperty('--card-bg', 'rgba(0, 0, 0, 0.28)')
    root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.10)')
    root.style.setProperty('--card-text', '#F9FAFB')
    root.style.setProperty('--card-text-2', '#9CA3AF')
    root.style.setProperty('--card-text-3', '#6B7280')
    root.style.setProperty('--text-on-bg', '#E5E7EB')
    root.style.setProperty('--text-dim', 'rgba(229,231,235,0.65)')
    root.style.setProperty('--input-bg', 'rgba(0,0,0,0.30)')
    root.style.setProperty('--input-border', 'rgba(255,255,255,0.12)')
    root.style.setProperty('--input-text', '#F9FAFB')
  } else {
    root.classList.remove('dark')
    root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.90)')
    root.style.setProperty('--card-border', 'rgba(255, 255, 255, 0.50)')
    root.style.setProperty('--card-text', '#111827')
    root.style.setProperty('--card-text-2', '#6B7280')
    root.style.setProperty('--card-text-3', '#9CA3AF')
    root.style.setProperty('--text-on-bg', '#ffffff')
    root.style.setProperty('--text-dim', 'rgba(255,255,255,0.65)')
    root.style.setProperty('--input-bg', 'rgba(255,255,255,0.60)')
    root.style.setProperty('--input-border', 'rgba(255,255,255,0.45)')
    root.style.setProperty('--input-text', '#111827')
  }
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      accentColor: 'Blue',
      theme: 'dark',
      setUser: (user) => set({ user }),
      setAccentColor: (color) => {
        set({ accentColor: color })
        applyCSS(color, get().theme)
      },
      setTheme: (theme) => {
        set({ theme })
        applyCSS(get().accentColor, theme)
      },
      applyTheme: () => {
        const { accentColor, theme } = get()
        applyCSS(accentColor, theme)
      },

      // ── Pomodoro ───────────────────────────────────────────
      pomMode: 'work',
      pomRunning: false,
      pomStartedAt: null,
      pomRemainingAtStart: POM_DURATIONS.work,

      getPomTime: () => {
        const { pomRunning, pomStartedAt, pomRemainingAtStart } = get()
        if (!pomRunning || !pomStartedAt) return pomRemainingAtStart
        const elapsed = (Date.now() - pomStartedAt) / 1000
        return Math.max(0, pomRemainingAtStart - elapsed)
      },

      togglePom: () => {
        const { pomRunning, pomStartedAt, pomRemainingAtStart } = get()
        if (pomRunning) {
          // Pause — snapshot remaining time
          const elapsed = pomStartedAt ? (Date.now() - pomStartedAt) / 1000 : 0
          const remaining = Math.max(0, pomRemainingAtStart - elapsed)
          set({ pomRunning: false, pomStartedAt: null, pomRemainingAtStart: remaining })
        } else {
          // Start / Resume
          set({ pomRunning: true, pomStartedAt: Date.now() })
        }
      },

      switchPomMode: (mode: PomMode) => {
        set({
          pomMode: mode,
          pomRunning: false,
          pomStartedAt: null,
          pomRemainingAtStart: POM_DURATIONS[mode],
        })
      },

      stopPom: () => {
        const { pomMode } = get()
        set({
          pomRunning: false,
          pomStartedAt: null,
          pomRemainingAtStart: POM_DURATIONS[pomMode],
        })
      },

      completePomCycle: () => {
        const { pomMode } = get()
        // Auto-switch mode after completion
        const next: PomMode = pomMode === 'work' ? 'short_break' : 'work'
        set({
          pomMode: next,
          pomRunning: false,
          pomStartedAt: null,
          pomRemainingAtStart: POM_DURATIONS[next],
        })
      },
    }),
    {
      name: 'floow-store',
      partialize: (state) => ({
        accentColor: state.accentColor,
        theme: state.theme,
        pomMode: state.pomMode,
        pomRunning: state.pomRunning,
        pomStartedAt: state.pomStartedAt,
        pomRemainingAtStart: state.pomRemainingAtStart,
      }),
    }
  )
)
