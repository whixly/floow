import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { ACCENT_COLORS, DARK_COLORS } from '../types'

interface AppStore {
  user: User | null
  accentColor: string
  theme: 'light' | 'dark'
  setUser: (user: User | null) => void
  setAccentColor: (color: string) => void
  setTheme: (theme: 'light' | 'dark') => void
  applyTheme: () => void
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
      theme: 'light',
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
    }),
    {
      name: 'floow-store',
      partialize: (state) => ({
        accentColor: state.accentColor,
        theme: state.theme,
      }),
    }
  )
)
