import { useState } from 'react'
import { Moon, Sun, Check, User, Palette } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { ACCENT_COLORS } from '../../types'

export default function SettingsPage() {
  const { user, accentColor, theme, setAccentColor, setTheme } = useStore()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)


  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, accent_color: accentColor, theme })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAccentChange = async (colorName: string) => {
    setAccentColor(colorName)
    if (user) await supabase.from('profiles').upsert({ id: user.id, accent_color: colorName })
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    if (user) await supabase.from('profiles').upsert({ id: user.id, theme: newTheme })
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition t-input'

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="t-text-dim text-sm mt-1">Customize your Floow experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* Profile */}
      <div className="t-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg)] flex items-center justify-center border border-white/20">
            <User size={16} className="text-white" />
          </div>
          <h2 className="font-semibold t-ct">Profile</h2>
        </div>
        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label className="text-sm font-medium t-ct-2 block mb-1">Full Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium t-ct-2 block mb-1">Email</label>
            <input value={user?.email ?? ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/20 disabled:opacity-60">
            {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Appearance */}
      <div className="t-card rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg)] flex items-center justify-center border border-white/20">
            <Palette size={16} className="text-white" />
          </div>
          <h2 className="font-semibold t-ct">Appearance</h2>
        </div>

        {/* Theme Toggle */}
        <div className="mb-6">
          <p className="text-sm font-medium t-ct mb-1">Mode</p>
          <p className="text-xs t-ct-3 mb-3">
            Light = white text on vivid color · Dark = light gray text on deep color
          </p>
          <div className="flex gap-3">
            {(['light', 'dark'] as const).map(t => (
              <button key={t} onClick={() => handleThemeChange(t)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition ${
                  theme === t ? 'bg-white/90 border-white/50' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
                style={theme === t ? { color: 'var(--theme-bg)' } : {}}>
                {t === 'light' ? <Sun size={16} /> : <Moon size={16} />}
                {t === 'light' ? 'Light' : 'Dark'}
                {theme === t && <Check size={14} className="ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <p className="text-sm font-medium t-ct mb-1">Background Color</p>
          <p className="text-xs t-ct-3 mb-4">This color becomes the background of the entire app</p>
          <div className="grid grid-cols-8 gap-3">
            {Object.entries(ACCENT_COLORS).map(([name, hex]) => (
              <button key={name} onClick={() => handleAccentChange(name)} title={name}
                className="flex flex-col items-center gap-1 group">
                <div className={`w-9 h-9 rounded-full transition-all hover:scale-110 flex items-center justify-center ${
                  accentColor === name ? 'ring-3 ring-white ring-offset-2 ring-offset-transparent scale-110' : ''
                }`} style={{ backgroundColor: hex, boxShadow: accentColor === name ? `0 0 0 3px white` : 'none' }}>
                  {accentColor === name && <Check size={14} className="text-white" />}
                </div>
                <span className="text-xs t-ct-3 hidden group-hover:block">{name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-white/40" style={{ backgroundColor: ACCENT_COLORS[accentColor] }} />
            <p className="text-sm t-ct">
              Selected: <span className="font-semibold text-white">{accentColor}</span>
            </p>
          </div>
        </div>
      </div>

      </div>{/* end 2-col grid */}

      {/* About */}
      <div className="t-card rounded-xl border p-6">
        <h2 className="font-semibold t-ct mb-3">About Floow</h2>
        <p className="text-sm t-ct-2">Version 1.0.0</p>
        <p className="text-sm t-ct-3 mt-1">Focus. Level up. Optimize. Overcome. Win.</p>
      </div>
    </div>
  )
}
