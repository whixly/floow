import { useEffect, useRef, useState } from 'react'
import { Check, User, Palette, Camera } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'
import { ACCENT_COLORS } from '../../types'

export default function SettingsPage() {
  const { user, accentColor, setAccentColor } = useStore()
  const [fullName,       setFullName]       = useState(user?.user_metadata?.full_name ?? '')
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('avatar_url, full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        if (data?.full_name)  setFullName(data.full_name)
      })
  }, [user])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl })
      setAvatarUrl(publicUrl + `?t=${Date.now()}`)
    }
    setUploadingAvatar(false)
    // reset so same file can be re-uploaded
    e.target.value = ''
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, accent_color: accentColor })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAccentChange = async (colorName: string) => {
    setAccentColor(colorName)
    if (user) await supabase.from('profiles').upsert({ id: user.id, accent_color: colorName })
  }

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition t-input'
  const initials = (fullName || user?.email || 'U')[0].toUpperCase()

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

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileRef.current?.click()}
              title="Click to change profile photo"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 text-2xl font-bold text-white select-none">
                  {initials}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Camera size={20} className="text-white" />
                }
              </div>
            </div>
            <p className="text-xs t-ct-3">Click to upload photo</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="text-sm font-medium t-ct-2 block mb-1">Full Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-sm font-medium t-ct-2 block mb-1">Email</label>
              <input
                value={user?.email ?? ''}
                disabled
                className={`${inputCls} opacity-50 cursor-not-allowed`}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-bg)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition border border-white/20 disabled:opacity-60"
            >
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

          <div>
            <p className="text-sm font-medium t-ct mb-1">Background Color</p>
            <p className="text-xs t-ct-3 mb-4">This color becomes the background of the entire app</p>
            <div className="grid grid-cols-8 gap-3">
              {Object.entries(ACCENT_COLORS).map(([name, hex]) => (
                <button key={name} onClick={() => handleAccentChange(name)} title={name}
                  className="flex flex-col items-center gap-1 group">
                  <div
                    className={`w-9 h-9 rounded-full transition-all hover:scale-110 flex items-center justify-center ${
                      accentColor === name ? 'scale-110' : ''
                    }`}
                    style={{
                      backgroundColor: hex,
                      boxShadow: accentColor === name ? `0 0 0 3px white` : 'none',
                    }}
                  >
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

      </div>

      {/* About */}
      <div className="t-card rounded-xl border p-6">
        <h2 className="font-semibold t-ct mb-3">About Floow</h2>
        <p className="text-sm t-ct-2">Version 1.0.0</p>
        <p className="text-sm t-ct-3 mt-1">Focus. Level up. Optimize. Overcome. Win.</p>
      </div>
    </div>
  )
}
