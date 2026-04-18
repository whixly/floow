import { useRef, useState } from 'react'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:border-white/70 transition t-input'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Sign-in fields
  const [siUsername, setSiUsername] = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Sign-up fields
  const [suAvatar, setSuAvatar] = useState<File | null>(null)
  const [suAvatarUrl, setSuAvatarUrl] = useState('')
  const [suUsername, setSuUsername] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  const pickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSuAvatar(file)
    setSuAvatarUrl(URL.createObjectURL(file))
  }

  // ── Sign In ──────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)

    // Look up email by username
    const { data: profile, error: lookupErr } = await supabase
      .rpc('get_email_by_username', { uname: siUsername.trim().toLowerCase() })

    if (lookupErr || !profile) {
      setError('Username not found.')
      setLoading(false); return
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: profile as string,
      password: siPassword,
    })
    if (authErr) setError(authErr.message)
    setLoading(false)
  }

  // ── Sign Up ──────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)

    const username = suUsername.trim().toLowerCase()

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('Username is already taken.')
      setLoading(false); return
    }

    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPassword,
      options: { data: { username, full_name: username } },
    })
    if (authErr || !authData.user) {
      setError(authErr?.message ?? 'Sign up failed.')
      setLoading(false); return
    }

    const uid = authData.user.id
    let avatarUrl = ''

    // Upload avatar if provided
    if (suAvatar) {
      const ext = suAvatar.name.split('.').pop()
      const path = `${uid}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, suAvatar, { upsert: true })
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = pub.publicUrl
      }
    }

    // Update profile
    await supabase.from('profiles').upsert({
      id: uid,
      email: suEmail.trim(),
      username,
      full_name: username,
      avatar_url: avatarUrl || null,
    })

    setMessage('Account created! Check your email to confirm before signing in.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen t-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <svg viewBox="89 27 360 184" className="h-16 w-auto mb-2" style={{ borderRadius: 10 }}>
            <defs>
              <radialGradient id="abgSphere" cx="28%" cy="25%" r="72%">
                <stop offset="0%" style={{ stopColor: 'var(--theme-bg)' }} stopOpacity={0.55} />
                <stop offset="58%" style={{ stopColor: 'var(--theme-bg)' }} stopOpacity={0.1} />
                <stop offset="100%" stopColor="#010101" stopOpacity={1} />
              </radialGradient>
              <radialGradient id="amg" cx="28%" cy="25%" r="72%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.92} />
                <stop offset="42%" style={{ stopColor: 'var(--theme-bg)' }} stopOpacity={1} />
                <stop offset="100%" stopColor="#010101" stopOpacity={1} />
              </radialGradient>
              <radialGradient id="amk" cx="28%" cy="25%" r="72%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
                <stop offset="100%" style={{ stopColor: 'var(--theme-bg)' }} stopOpacity={1} />
              </radialGradient>
            </defs>
            <rect x="89" y="27" width="360" height="184" rx="10" fill="url(#abgSphere)" />
            {[[108,60],[124,48],[138,54],[108,78],[108,96],[108,114],[126,114],[142,114],[108,132],[108,150],[108,168]].map(([cx,cy]) => (
              <circle key={`af${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#amg)" />
            ))}
            {[[174,42],[174,60],[174,78],[174,96],[174,114],[174,132],[174,150],[174,168]].map(([cx,cy]) => (
              <circle key={`al${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#amg)" />
            ))}
            {[[204,96],[222,96],[240,96],[258,96],[204,114],[258,114],[204,132],[258,132],[204,150],[258,150],[204,168],[222,168],[240,168],[258,168]].map(([cx,cy]) => (
              <circle key={`ao1${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#amg)" />
            ))}
            <circle cx={231} cy={132} r="9" fill="url(#amk)" />
            {[[282,96],[300,96],[318,96],[336,96],[282,114],[336,114],[282,132],[336,132],[282,150],[336,150],[282,168],[300,168],[318,168],[336,168]].map(([cx,cy]) => (
              <circle key={`ao2${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#amg)" />
            ))}
            <circle cx={309} cy={132} r="9" fill="url(#amk)" />
            {[[362,96],[434,96],[362,114],[398,114],[434,114],[362,132],[398,132],[434,132],[362,150],[380,150],[398,150],[416,150],[434,150],[362,168],[380,168],[416,168],[434,168]].map(([cx,cy]) => (
              <circle key={`aw${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#amg)" />
            ))}
            {[258,270,282].map((cx, i) => (
              <circle key={`alip${i}`} cx={cx} cy={196} r="5" fill="url(#amk)"
                style={{ animation: `lipPulse 1.4s ease-in-out ${i * 0.22}s infinite`, transformBox: 'fill-box', transformOrigin: 'center' }} />
            ))}
          </svg>
          <p className="t-text-dim text-sm">Focus. Level up. Optimize. Overcome. Win.</p>
        </div>

        {/* Card */}
        <div className="t-card rounded-2xl border p-8">
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border border-black/10 mb-6">
            {(['signin', 'signup'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setError(''); setMessage('') }}
                className={`flex-1 py-2.5 text-sm font-semibold transition ${
                  mode === tab ? 'bg-[var(--theme-bg)] text-white' : 't-ct-2 hover:t-ct'
                }`}
              >
                {tab === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* ── SIGN IN ── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-medium t-ct-2 block mb-1">Username</label>
                <input value={siUsername} onChange={e => setSiUsername(e.target.value)}
                  placeholder="your_username" required className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium t-ct-2 block mb-1">Password</label>
                <div className="relative">
                  <input value={siPassword} onChange={e => setSiPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'} placeholder="••••••••"
                    required className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 t-ct-3 hover:t-ct transition">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-white/90 font-semibold rounded-lg hover:bg-white transition disabled:opacity-60"
                style={{ color: 'var(--theme-bg)' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Avatar picker */}
              <div className="flex flex-col items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-20 h-20 rounded-full bg-white/15 border-2 border-white/30 hover:border-white/60 transition overflow-hidden flex items-center justify-center group">
                  {suAvatarUrl
                    ? <img src={suAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : <Camera size={28} className="text-white/50 group-hover:text-white/80 transition" />
                  }
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </button>
                <p className="text-xs t-ct-3">Tap to upload profile photo</p>
                <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
              </div>

              <div>
                <label className="text-xs font-medium t-ct-2 block mb-1">Username</label>
                <input value={suUsername} onChange={e => setSuUsername(e.target.value)}
                  placeholder="your_username" required className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium t-ct-2 block mb-1">Email</label>
                <input type="email" value={suEmail} onChange={e => setSuEmail(e.target.value)}
                  placeholder="you@example.com" required className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-medium t-ct-2 block mb-1">Password</label>
                <div className="relative">
                  <input value={suPassword} onChange={e => setSuPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'} placeholder="Min 6 characters"
                    required minLength={6} className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 t-ct-3 hover:t-ct transition">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
              {message && <p className="text-sm text-green-600 bg-green-500/10 px-3 py-2 rounded-lg">{message}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-white/90 font-semibold rounded-lg hover:bg-white transition disabled:opacity-60"
                style={{ color: 'var(--theme-bg)' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="text-xs t-ct-3 text-center">
                You'll receive a confirmation email. Please verify before signing in.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
